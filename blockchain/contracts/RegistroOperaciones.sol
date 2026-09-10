// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RegistroOperaciones {

    // =========================================
    // ESTRUCTURA DE UNA OPERACIÓN
    // =========================================

    struct Operacion {

        uint256 id;

        string hashOperacion;

        string tipoOperacion;

        string referencia;

        string usuario;

        uint256 fecha;

        address registrador;

    }


    // =========================================
    // LISTA DE OPERACIONES
    // =========================================

    Operacion[] public operaciones;


    // =========================================
    // EVENTO
    // =========================================

    event OperacionRegistrada(

        uint256 indexed id,

        string hashOperacion,

        string tipoOperacion,

        string referencia,

        string usuario,

        uint256 fecha,

        address registrador

    );


    // =========================================
    // REGISTRAR OPERACIÓN
    // =========================================

    function registrarOperacion(

        string memory _hashOperacion,

        string memory _tipoOperacion,

        string memory _referencia,

        string memory _usuario

    ) public {


        uint256 nuevoId = operaciones.length;


        operaciones.push(

            Operacion({

                id: nuevoId,

                hashOperacion: _hashOperacion,

                tipoOperacion: _tipoOperacion,

                referencia: _referencia,

                usuario: _usuario,

                fecha: block.timestamp,

                registrador: msg.sender

            })

        );


        emit OperacionRegistrada(

            nuevoId,

            _hashOperacion,

            _tipoOperacion,

            _referencia,

            _usuario,

            block.timestamp,

            msg.sender

        );

    }


    // =========================================
    // OBTENER CANTIDAD DE OPERACIONES
    // =========================================

    function obtenerCantidadOperaciones()

        public

        view

        returns (uint256)

    {

        return operaciones.length;

    }


    // =========================================
    // OBTENER OPERACIÓN
    // =========================================

    function obtenerOperacion(uint256 _id)

        public

        view

        returns (

            uint256,

            string memory,

            string memory,

            string memory,

            string memory,

            uint256,

            address

        )

    {


        require(

            _id < operaciones.length,

            "Operacion no existe"

        );


        Operacion memory op = operaciones[_id];


        return (

            op.id,

            op.hashOperacion,

            op.tipoOperacion,

            op.referencia,

            op.usuario,

            op.fecha,

            op.registrador

        );

    }

}