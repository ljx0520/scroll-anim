/* jshint esversion: 6 */
/* jslint browser: true */
/* global window */
import React from 'react';

export const windowIsUndefined = !(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export function toArrayChildren(children) {
  const ret = [];
  React.Children.forEach(children, (c) => {
    ret.push(c);
  });
  return ret;
}


export function dataToArray(vars) {
  if (!vars && vars !== 0) {
    return [];
  }
  if (Array.isArray(vars)) {
    return vars;
  }
  return [vars];
}

export function transformArguments(arg) {
  if (Array.isArray(arg)) {
    if (arg.length === 2) {
      return arg;
    }
    return [arg.join(), arg.join()];
  }
  return [arg, arg];
}



export function objectEqual(obj1, obj2) {
  if (!obj1 || !obj2) {
    return false;
  }
  if (obj1 === obj2) {
    return true;
  }
  let equalBool = true;
  function forEachData(current, next) {
    Object.keys(current).forEach(p => {
      if (current[p] !== next[p]) {
        if (typeof current[p] === 'object' && typeof next[p] === 'object') {
          equalBool = objectEqual(current[p], next[p]);
        } else {
          equalBool = false;
          
        }
      }
    });
  }
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    for (let i = 0; i < obj1.length; i++) {
      const currentObj = obj1[i];
      const nextObj = obj2[i];
      forEachData(currentObj, nextObj);
    }
  }

  Object.keys(obj1).forEach(key => {
    if (!(key in obj2)) {
      equalBool = false;
      return;
    }

    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      equalBool = objectEqual(obj1[key], obj2[key]);
    } else if (typeof obj1[key] === 'function' && typeof obj2[key] === 'function') {
      if (obj1[key].name !== obj2[key].name) {
        equalBool = false;
      }
    } else if (obj1[key] !== obj2[key]) {
      equalBool = false;
    }
  });

  Object.keys(obj2).forEach(key => {
    if (!(key in obj1)) {
      equalBool = false;
      return;
    }
    if (typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
      equalBool = objectEqual(obj2[key], obj1[key]);
    } else if (typeof obj1[key] === 'function' && typeof obj2[key] === 'function') {
      if (obj1[key].name !== obj2[key].name) {
        equalBool = false;
      }
    } else if (obj2[key] !== obj1[key]) {
      equalBool = false;
    }
  });

  return equalBool;
}

export function currentScrollTop() {
  return window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;
}

export function windowHeight() {
  return window.innerHeight ||
    document.documentElement.clientHeight || document.body.clientHeight;
}

export function noop() {
}

export const getPassive = () => {
  if (windowIsUndefined) {
    return false;
  }
  let passiveSupported = false;
  window.addEventListener(
    'test',
    () => { },
    Object.defineProperty({}, 'passive', {
      get: () => {
        passiveSupported = true;
        return null;
      },
    }),
  );
  return passiveSupported ? { passive: false } : false;
}
