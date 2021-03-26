'use strict';

const App = require('..').App;

console.log('Permissions:', App.getPermissions());
console.log('Categories:', App.getCategories());
console.log('Locales:', App.getLocales());