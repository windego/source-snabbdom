import {
  // init,
  // classModule,
  // propsModule,
  styleModule,
  eventListenersModule,
  h,
} from 'snabbdom'

import { classModule } from '../lib/snabbdom/src/modules/class'
import { propsModule } from '../lib/snabbdom/src/modules/props'
import { init } from '../lib/snabbdom/src/init'
// import h from './mysnabbdom/h'
//初始化patch
const patch = init([
  classModule, // makes it easy to toggle classes
  propsModule, // for setting properties on DOM elements
  styleModule, // handles styling on elements with support for animations
  eventListenersModule, // attaches event listeners
])

const container = document.getElementById('container')
const btn1 = document.getElementById('btn1')
const btn2 = document.getElementById('btn2')
const btn3 = document.getElementById('btn3')
const someFn = () => {
  console.log(1111111)
}
const anotherEventHandler = () => {}

const vnode1 = h('ul', {}, [
  h('li', { key: 'a', class: { red: true } }, 'A'),
  h('li', { key: 'b', class: { red: true }, on: { click: someFn } }, 'B'),
  h('li', { key: 'c', class: { red: true } }, 'C'),
  h('li', { key: 'd', class: { red: true } }, 'D'),
  h('li', { key: 'e', class: { red: true } }, 'E'),
])
const vnodeBlue = h('ul', {}, [
  h('li', { key: 'a', class: { blue: true } }, 'A'),
  h('li', { key: 'b', class: { blue: true } }, 'B'),
  // h('li', { key: 'c', class: { blue: true } }, 'C'),
  // h('li', { key: 'd', class: { blue: true } }, 'D'),
  // h('li', { key: 'e', class: { red: true } }, 'E'),
  // h('li', { key: 'f', class: { blue: true } }, 'F'),
])
console.log('挂载!!!!!')
patch(container, vnode1)
const vnode2 = h('ul', [
  h('li', { key: 'e' }, 'E'),
  h('li', { key: 'a' }, 'A'),
  h('li', { key: 'b' }, 'B'),
  h('li', { key: 'c' }, 'C'),
  h('li', { key: 'd' }, 'D'),
])
btn1.onclick = () => {
  patch(vnode1, vnode2)
}
const vnode3 = h('ol', [
  h('li', { key: 'e' }, 'E'),
  h('li', { key: 'a' }, 'A'),
  h('li', { key: 'b' }, 'B'),
  h('li', { key: 'c' }, 'C'),
  h('li', { key: 'd' }, 'D'),
])
const newVnode = h('div#container.two.classes', [
  h('span', { style: { fontWeight: 'normal', fontStyle: 'italic' } }, 'This is now italic type'),
  ' and this is still just normal text',
  h('a', { props: { href: '/bar' } }, "I'll take you places!"),
])
btn2.onclick = () => {
  patch(vnode2, vnode3)
}
btn3.onclick = () => {
  patch(vnode1, vnodeBlue)
}

//https://segmentfault.com/a/1190000017518948
