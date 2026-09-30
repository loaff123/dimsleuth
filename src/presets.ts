import type { Preset, SymbolInput } from './core/types.ts';
const symbols=(items:[string,string][]):SymbolInput[]=>items.map(([name,unit])=>({name,unit}));
export const PRESETS:Preset[]=[
 {id:'kinematics',title:'Kinematics',titleZh:'运动学',description:'A missing power of time. Spot the incompatible addition.',descriptionZh:'时间少了一个幂次，找出不兼容的相加项。',project:{schemaVersion:1,title:'The missing second',formula:'x = v*t + a*t',symbols:symbols([['x','m'],['v','m/s'],['a','m/s^2'],['t','s']])},repair:'x = v*t + a*t^2'},
 {id:'energy',title:'Kinetic energy',titleZh:'动能',description:'Mass × velocity squared. The factor 1/2 has no dimension.',descriptionZh:'质量乘速度的平方。系数 1/2 没有量纲。',project:{schemaVersion:1,title:'Kinetic energy',formula:'E = (1/2)*m*v^2',symbols:symbols([['E','J'],['m','kg'],['v','m/s']])}},
 {id:'pendulum',title:'Pendulum',titleZh:'单摆',description:'A square root turns length / acceleration into time.',descriptionZh:'长度与加速度之比开平方得到时间。',project:{schemaVersion:1,title:'Small-angle pendulum',formula:'T = 2*pi*sqrt(l/g)',symbols:symbols([['T','s'],['l','m'],['g','m/s^2']])}},
 {id:'power',title:'Electric power',titleZh:'电功率',description:'Volts × amperes reduce to watts.',descriptionZh:'伏特乘安培可化为瓦特。',project:{schemaVersion:1,title:'Electrical power',formula:'P = V*I',symbols:symbols([['P','W'],['V','V'],['I','A']])}},
 {id:'reynolds',title:'Reynolds number',titleZh:'雷诺数',description:'Density, speed, length and viscosity cancel to a pure number.',descriptionZh:'密度、速度、长度与动力黏度的量纲相互抵消。',project:{schemaVersion:1,title:'Reynolds number',formula:'Re = rho*v*L/mu',symbols:symbols([['Re','1'],['rho','kg/m^3'],['v','m/s'],['L','m'],['mu','Pa*s']])}},
 {id:'debroglie',title:'de Broglie',titleZh:'德布罗意波长',description:'Planck constant divided by momentum gives a wavelength.',descriptionZh:'普朗克常数除以动量得到波长。',project:{schemaVersion:1,title:'Matter wavelength',formula:'lambda = h/p',symbols:symbols([['lambda','m'],['h','J*s'],['p','kg*m/s']])}}
];
