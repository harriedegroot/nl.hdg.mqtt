'use strict';

class Energy {

  static getCurrencies() {
    return require('../../assets/energy/currencies.json');
  }
  
  static getBatteries() {
     return [
      'LS14250',
      'C',
      'AA',
      'AAA',
      'AAAA',
      'A23',
      'A27',
      'PP3',
      'CR123A',
      'CR2',
      'CR1632',
      'CR2032',
      'CR2450',
      'CR2477',
      'CR3032',
      'CR14250',
      'INTERNAL',
      'OTHER',
    ];
  }

}

module.exports = Energy;
