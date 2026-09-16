from django.core.management.base import BaseCommand, CommandError
from django.db import connection


PROTEGIDAS = {
    'medicamentos': 'id',
    'compras_proveedor': 'id',
    'compras_compra': 'id',
    'compras_detallecompra': 'id',
    'compras_registroblockchain': 'id',
    'ventas_venta': 'id',
    'ventas_detalleventa': 'id',
    'ventas_registroblockchainventa': 'id',
    'usuarios_usuario': 'id',
    'usuarios_sistema_usuariosistema': 'id',
    'reporte': 'id_reporte',
}

# Campo más entendible para identificar el registro en la notificación.
REFERENCIAS = {
    'medicamentos': ['nombre', 'codigo'],
    'compras_proveedor': ['nombre', 'razon_social'],
    'compras_compra': ['factura'],
    'compras_detallecompra': ['id'],
    'compras_registroblockchain': ['hash_operacion', 'id'],
    'ventas_venta': ['numero_venta'],
    'ventas_detalleventa': ['id'],
    'ventas_registroblockchainventa': ['hash_operacion', 'id'],
    'usuarios_usuario': ['username', 'nombre', 'usuario'],
    'usuarios_sistema_usuariosistema': ['username', 'nombre', 'usuario'],
    'reporte': ['nombre', 'titulo', 'id_reporte'],
}

# Tipos que no conviene convertir a texto dentro del trigger.
TIPOS_OMITIDOS = {
    'blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary',
}


class Command(BaseCommand):
    help = 'Instala la protección MySQL y registra exactamente qué campo/valor se intentó alterar.'

    def _columnas(self, cursor, db_name, tabla):
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION
        """, [db_name, tabla])
        return [(fila[0], str(fila[1]).lower()) for fila in cursor.fetchall()]

    def _asegurar_columnas_auditoria(self, cursor, db_name):
        requeridas = {
            'referencia_registro': 'VARCHAR(255) NULL',
            'campos_modificados': 'TEXT NULL',
            'valor_anterior': 'LONGTEXT NULL',
            'valor_intentado': 'LONGTEXT NULL',
        }
        cursor.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'seguridad_intentos_bd'
        """, [db_name])
        actuales = {fila[0] for fila in cursor.fetchall()}
        for nombre, definicion in requeridas.items():
            if nombre not in actuales:
                cursor.execute(
                    f"ALTER TABLE seguridad_intentos_bd ADD COLUMN `{nombre}` {definicion}"
                )

    def _concat_ws(self, separador, expresiones, fallback="NULL"):
        if not expresiones:
            return fallback
        return "CONCAT_WS(%s, %s)" % (
            "'" + separador.replace("'", "''") + "'",
            ', '.join(expresiones),
        )

    def _expr_referencia(self, tabla, nombres_columnas, prefijo, pk):
        candidatos = REFERENCIAS.get(tabla, [])
        elegidos = [c for c in candidatos if c in nombres_columnas and c != pk][:2]
        if not elegidos:
            return f"CAST({prefijo}.`{pk}` AS CHAR)"
        partes = [
            f"NULLIF(TRIM(COALESCE(CAST({prefijo}.`{c}` AS CHAR), '')), '')"
            for c in elegidos
        ]
        return self._concat_ws(' - ', partes, f"CAST({prefijo}.`{pk}` AS CHAR)")

    def _expr_update(self, columnas, pk):
        auditables = [c for c, tipo in columnas if c != pk and tipo not in TIPOS_OMITIDOS]

        campos = []
        anteriores = []
        intentados = []
        for c in auditables:
            cambio = f"NOT (OLD.`{c}` <=> NEW.`{c}`)"
            campos.append(f"CASE WHEN {cambio} THEN '{c}' ELSE NULL END")
            anteriores.append(
                f"CASE WHEN {cambio} THEN CONCAT('{c} = ', COALESCE(CAST(OLD.`{c}` AS CHAR), 'NULL')) ELSE NULL END"
            )
            intentados.append(
                f"CASE WHEN {cambio} THEN CONCAT('{c} = ', COALESCE(CAST(NEW.`{c}` AS CHAR), 'NULL')) ELSE NULL END"
            )

        return (
            self._concat_ws(', ', campos, "'Sin cambios detectables'"),
            self._concat_ws(' | ', anteriores),
            self._concat_ws(' | ', intentados),
        )

    def _expr_snapshot(self, columnas, prefijo, pk):
        auditables = [c for c, tipo in columnas if c != pk and tipo not in TIPOS_OMITIDOS]
        partes = [
            f"CONCAT('{c} = ', COALESCE(CAST({prefijo}.`{c}` AS CHAR), 'NULL'))"
            for c in auditables
        ]
        return self._concat_ws(' | ', partes)

    def handle(self, *args, **options):
        if connection.vendor != 'mysql':
            raise CommandError('Esta protección está diseñada para MySQL.')

        with connection.cursor() as cursor:
            cursor.execute('SELECT DATABASE()')
            db_name = cursor.fetchone()[0]

            # MyISAM es intencional: el intento queda guardado aunque el trigger
            # rechace la sentencia original con SIGNAL.
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS seguridad_intentos_bd (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    fecha_hora DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    usuario_bd VARCHAR(150) NOT NULL,
                    conexion_id BIGINT NULL,
                    tabla_afectada VARCHAR(100) NOT NULL,
                    registro_id VARCHAR(100) NULL,
                    referencia_registro VARCHAR(255) NULL,
                    accion VARCHAR(20) NOT NULL,
                    campos_modificados TEXT NULL,
                    valor_anterior LONGTEXT NULL,
                    valor_intentado LONGTEXT NULL,
                    detalle TEXT NOT NULL,
                    estado VARCHAR(30) NOT NULL DEFAULT 'BLOQUEADO',
                    leida TINYINT(1) NOT NULL DEFAULT 0,
                    fecha_revision DATETIME(6) NULL,
                    PRIMARY KEY (id),
                    KEY idx_seguridad_fecha (fecha_hora),
                    KEY idx_seguridad_leida (leida)
                ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            self._asegurar_columnas_auditoria(cursor, db_name)

            cursor.execute("""
                SELECT TABLE_NAME
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = %s
            """, [db_name])
            existentes = {fila[0] for fila in cursor.fetchall()}

            instaladas = []
            omitidas = []

            for tabla, pk in PROTEGIDAS.items():
                if tabla not in existentes:
                    omitidas.append(tabla)
                    continue

                columnas = self._columnas(cursor, db_name, tabla)
                nombres_columnas = {c for c, _ in columnas}
                if pk not in nombres_columnas:
                    omitidas.append(tabla)
                    continue

                safe = ''.join(c if c.isalnum() else '_' for c in tabla)

                for accion in ('INSERT', 'UPDATE', 'DELETE'):
                    sufijo = {'INSERT': 'bi', 'UPDATE': 'bu', 'DELETE': 'bd'}[accion]
                    trigger = f'farmacor_{sufijo}_{safe}'
                    cursor.execute(f'DROP TRIGGER IF EXISTS `{trigger}`')

                    if accion == 'INSERT':
                        id_expr = f"CAST(NEW.`{pk}` AS CHAR)"
                        ref_expr = self._expr_referencia(tabla, nombres_columnas, 'NEW', pk)
                        campos_expr = "'NUEVO_REGISTRO'"
                        anterior_expr = 'NULL'
                        intentado_expr = self._expr_snapshot(columnas, 'NEW', pk)
                    elif accion == 'DELETE':
                        id_expr = f"CAST(OLD.`{pk}` AS CHAR)"
                        ref_expr = self._expr_referencia(tabla, nombres_columnas, 'OLD', pk)
                        campos_expr = "'REGISTRO_COMPLETO'"
                        anterior_expr = self._expr_snapshot(columnas, 'OLD', pk)
                        intentado_expr = 'NULL'
                    else:
                        id_expr = f"CAST(OLD.`{pk}` AS CHAR)"
                        ref_expr = self._expr_referencia(tabla, nombres_columnas, 'OLD', pk)
                        campos_expr, anterior_expr, intentado_expr = self._expr_update(columnas, pk)

                    detalle_expr = (
                        "CONCAT('FARMACOR detectó un intento de " + accion +
                        " directo en MySQL. La operación fue bloqueada antes de modificar los datos. ', "
                        "'Campos: ', COALESCE(" + campos_expr + ", 'No identificado'), '.')"
                    )

                    sql = f"""
                        CREATE TRIGGER `{trigger}`
                        BEFORE {accion} ON `{tabla}`
                        FOR EACH ROW
                        BEGIN
                            IF COALESCE(@farmacor_autorizado, 0) <> 1 THEN
                                INSERT INTO seguridad_intentos_bd (
                                    fecha_hora,
                                    usuario_bd,
                                    conexion_id,
                                    tabla_afectada,
                                    registro_id,
                                    referencia_registro,
                                    accion,
                                    campos_modificados,
                                    valor_anterior,
                                    valor_intentado,
                                    detalle,
                                    estado,
                                    leida
                                ) VALUES (
                                    NOW(6),
                                    USER(),
                                    CONNECTION_ID(),
                                    '{tabla}',
                                    {id_expr},
                                    {ref_expr},
                                    '{accion}',
                                    {campos_expr},
                                    {anterior_expr},
                                    {intentado_expr},
                                    {detalle_expr},
                                    'BLOQUEADO',
                                    0
                                );

                                SIGNAL SQLSTATE '45000'
                                    SET MESSAGE_TEXT = 'FARMACOR: operación directa no autorizada. Cambio bloqueado.';
                            END IF;
                        END
                    """
                    cursor.execute(sql)

                instaladas.append(tabla)

        self.stdout.write(self.style.SUCCESS(''))
        self.stdout.write(self.style.SUCCESS('============================================================'))
        self.stdout.write(self.style.SUCCESS(' PROTECCIÓN FARMACOR DETALLADA INSTALADA CORRECTAMENTE'))
        self.stdout.write(self.style.SUCCESS('============================================================'))
        self.stdout.write(self.style.SUCCESS(f'Tablas protegidas: {len(instaladas)}'))
        for tabla in instaladas:
            self.stdout.write(self.style.SUCCESS(f'  [OK] {tabla}'))

        if omitidas:
            self.stdout.write(self.style.WARNING('Tablas no existentes o sin PK esperada (se omitieron):'))
            for tabla in omitidas:
                self.stdout.write(self.style.WARNING(f'  [--] {tabla}'))

        self.stdout.write('')
        self.stdout.write('Ahora cada intento muestra: campo(s), valor anterior y valor intentado.')
        self.stdout.write('Django: cambios permitidos.')
        self.stdout.write('phpMyAdmin/Workbench/consola MySQL: cambios directos bloqueados.')
