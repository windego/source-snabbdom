import {
  init,
  classModule,
  propsModule,
  styleModule,
  eventListenersModule,
  h,
} from "snabbdom";

// import h from './mysnabbdom/h'
//初始化patch
const patch = init([

  classModule, // makes it easy to toggle classes
  propsModule, // for setting properties on DOM elements
  styleModule, // handles styling on elements with support for animations
  eventListenersModule, // attaches event listeners
]);

const vnode = h('a', { props: { href: 'https://www.windego.cn', target: "_black" } }, "vnode1")
console.log(vnode);
const container = document.getElementById("container");
patch(container, vnode);


const vnode2 = h('div', { class: { box: true } }, "一个空盒子")
setTimeout(() => {
  patch(vnode, vnode2)
}, 1000);

const vnode3 = h("ul", [
  h('li', "苹果"),
  h('li', "香蕉"),
  h('li', h('div', [
    h('p', 'xx'),
    h('p', 'hh')
  ]))
])
console.log(vnode3);
setTimeout(() => {
  patch(vnode, vnode3)
}, 2000);

// Patch into empty DOM element – this modifies the DOM as a side effect
// patch(container, vnode);

