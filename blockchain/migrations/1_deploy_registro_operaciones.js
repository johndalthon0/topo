const RegistroOperaciones = artifacts.require(
  "RegistroOperaciones"
);

module.exports = function (deployer) {

  deployer.deploy(
    RegistroOperaciones
  );

};