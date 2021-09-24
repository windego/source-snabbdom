import { Module } from './modules/module'
import { vnode, VNode } from './vnode'
import * as is from './is'
import { htmlDomApi, DOMAPI } from './htmldomapi'

type NonUndefined<T> = T extends undefined ? never : T

function isUndef(s: any): boolean {
  return s === undefined
}
function isDef<A>(s: A): s is NonUndefined<A> {
  return s !== undefined
}

type VNodeQueue = VNode[]

const emptyNode = vnode('', {}, [], undefined, undefined)

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  const isSameKey = vnode1.key === vnode2.key
  const isSameIs = vnode1.data?.is === vnode2.data?.is
  const isSameSel = vnode1.sel === vnode2.sel

  return isSameSel && isSameKey && isSameIs
}

function isVnode(vnode: any): vnode is VNode {
  return vnode.sel !== undefined
}

type KeyToIndexMap = { [key: string]: number }

type ArraysOf<T> = {
  [K in keyof T]: Array<T[K]>
}

type ModuleHooks = ArraysOf<Required<Module>>

//子节点是个数组,生成k和i的对应关系
function createKeyToOldIdx(children: VNode[], beginIdx: number, endIdx: number): KeyToIndexMap {
  const map: KeyToIndexMap = {}
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = children[i]?.key
    if (key !== undefined) {
      map[key as string] = i
    }
  }
  return map
}

const hooks: Array<keyof Module> = ['create', 'update', 'remove', 'destroy', 'pre', 'post']

export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  // console.log('modules', modules)
  const cbs: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: [],
  }

  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi

  for (const hook of hooks) {
    for (const module of modules) {
      const currentHook = module[hook]
      if (currentHook !== undefined) {
        ;(cbs[hook] as any[]).push(currentHook)
      }
    }
  }
  console.log('cbs', cbs)

  function emptyNodeAt(elm: Element) {
    console.log('elm', elm, elm.id)
    const id = elm.id ? '#' + elm.id : ''

    // elm.className doesn't return a string when elm is an SVG element inside a shadowRoot.
    // https://stackoverflow.com/questions/29454340/detecting-classname-of-svganimatedstring
    const classes = elm.getAttribute('class')

    const c = classes ? '.' + classes.split(' ').join('.') : ''
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm)
  }

  function createRmCb(childElm: Node, listeners: number) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm) as Node
        api.removeChild(parent, childElm)
      }
    }
  }

  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any
    let data = vnode.data
    if (data !== undefined) {
      const init = data.hook?.init
      if (isDef(init)) {
        init(vnode)
        data = vnode.data
      }
    }
    const children = vnode.children
    const sel = vnode.sel
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = ''
      }
      vnode.elm = api.createComment(vnode.text!)
    } else if (sel !== undefined) {
      // Parse selector
      const hashIdx = sel.indexOf('#')
      const dotIdx = sel.indexOf('.', hashIdx)
      const hash = hashIdx > 0 ? hashIdx : sel.length
      const dot = dotIdx > 0 ? dotIdx : sel.length
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel
      const elm = (vnode.elm =
        isDef(data) && isDef((i = data.ns))
          ? api.createElementNS(i, tag, data)
          : api.createElement(tag, data))
      //截取id
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot))
      //截取class
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '))
      for (i = 0; i < cbs.create.length; ++i) {
        console.log('创建节点', i)
        cbs.create[i](emptyNode, vnode)
      }
      if (is.array(children)) {
        console.log('子节点是数组')
        for (i = 0; i < children.length; ++i) {
          const ch = children[i]
          if (ch != null) {
            //循环创建子节点并插入
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue))
          }
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text))
      }
      const hook = vnode.data!.hook
      if (isDef(hook)) {
        hook.create?.(emptyNode, vnode)
        if (hook.insert) {
          insertedVnodeQueue.push(vnode)
        }
      }
    } else {
      vnode.elm = api.createTextNode(vnode.text!)
    }
    return vnode.elm
  }

  function addVnodes(
    parentElm: Node,
    before: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue
  ) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before)
      }
    }
  }

  function invokeDestroyHook(vnode: VNode) {
    const data = vnode.data
    if (data !== undefined) {
      data?.hook?.destroy?.(vnode)
      for (let i = 0; i < cbs.destroy.length; ++i) {
        console.log('在这里执行destroy Hook')
        cbs.destroy[i](vnode)
      }
      if (vnode.children !== undefined) {
        for (let j = 0; j < vnode.children.length; ++j) {
          const child = vnode.children[j]
          if (child != null && typeof child !== 'string') {
            invokeDestroyHook(child)
          }
        }
      }
    }
  }

  function removeVnodes(parentElm: Node, vnodes: VNode[], startIdx: number, endIdx: number): void {
    console.log('removeVnodes')
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners: number
      let rm: () => void
      const ch = vnodes[startIdx]
      //先判断是否为空,因为在diff时如果移动节点会将该位置原有vnode置空
      if (ch != null) {
        if (isDef(ch.sel)) {
          console.log('是vnode非纯文本的情况')
          invokeDestroyHook(ch)
          listeners = cbs.remove.length + 1
          rm = createRmCb(ch.elm!, listeners)
          for (let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm)
          const removeHook = ch?.data?.hook?.remove
          if (isDef(removeHook)) {
            removeHook(ch, rm)
          } else {
            rm()
          }
        } else {
          // Text node
          console.log('removeChild')
          api.removeChild(parentElm, ch.elm!)
        }
      }
    }
  }

  //最主要的方法吧
  function updateChildren(
    parentElm: Node,
    oldCh: VNode[],
    newCh: VNode[],
    insertedVnodeQueue: VNodeQueue
  ) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx: KeyToIndexMap | undefined
    let idxInOld: number
    let elmToMove: VNode
    let before: any

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      console.log('oldStartIdx', oldStartIdx, newStartIdx)
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx]
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        console.log('起始子节点相同!!!')
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        console.log('结束子节点相同!!!')
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        // Vnode moved right
        //旧 - 新  首 - 尾  遍历
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldStartVnode.elm!, api.nextSibling(oldEndVnode.elm!))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        // Vnode moved left
        //旧 - 新  尾 - 首   遍历
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        //最后再使用key, 前序步骤会减少部分节点
        if (oldKeyToIdx === undefined) {
          //得到key - id的映射关系
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        }
        console.log('oldKeyToIdx', oldKeyToIdx)
        //在旧keylist中,查找新key
        //新node 即使没有key时,作为"""  obj[""]=>undefined
        idxInOld = oldKeyToIdx[newStartVnode.key as string]
        console.log('idxInOld', idxInOld)
        if (isUndef(idxInOld)) {
          //如果是undefined 没有在oldNode中找到
          // New element
          api.insertBefore(
            parentElm,
            createElm(newStartVnode, insertedVnodeQueue),
            oldStartVnode.elm!
          )
        } else {
          console.log('oldNode中存在该节点')
          elmToMove = oldCh[idxInOld]
          if (elmToMove.sel !== newStartVnode.sel) {
            //虽然Key相同但是节点不同了
            api.insertBefore(
              parentElm,
              createElm(newStartVnode, insertedVnodeQueue),
              oldStartVnode.elm!
            )
          } else {
            //key相同,新旧节点相同时

            //把新node更改应用到新node上
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined as any
            //移动节点
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    console.log(oldStartIdx, oldEndIdx, newStartIdx, newEndIdx)

    /**
     * 如果oldCh 和 newCh节点数量一样,
     * 则会oldStartIdx>oldEndIdx且newStartIdx>newEndIdx
     * 如果数量不一直,如果oldStartIdx > oldEndIdx 即newStartIdx <= newEndIdx,说明newCh节点数量多,则插入节点
     * 否则就是oldStartIdx < oldEndIdx 说明oldCh数量多,则要删除节点
     */
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      if (oldStartIdx > oldEndIdx) {
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
      } else {
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
      }
    }
  }

  function patchVnode(oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    const hook = vnode.data?.hook
    hook?.prepatch?.(oldVnode, vnode)
    const elm = (vnode.elm = oldVnode.elm)!
    const oldCh = oldVnode.children as VNode[]
    const ch = vnode.children as VNode[]
    if (oldVnode === vnode) return
    if (vnode.data !== undefined) {
      for (let i = 0; i < cbs.update.length; ++i) {
        cbs.update[i](oldVnode, vnode) //更新dom
      }
      console.log('vnode.data !== undefined')
      vnode.data.hook?.update?.(oldVnode, vnode)
    }
    console.log('生成新dom')
    if (isUndef(vnode.text)) {
      console.log('isUndef(vnode.text)', isUndef(vnode.text))
      if (isDef(oldCh) && isDef(ch)) {
        console.log('更新子节点')
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      }
      api.setTextContent(elm, vnode.text!)
    }
    hook?.postpatch?.(oldVnode, vnode)
  }

  return function patch(oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node
    const insertedVnodeQueue: VNodeQueue = []
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]()

    //第一次patch
    if (!isVnode(oldVnode)) {
      console.log('oldVnode', oldVnode)
      oldVnode = emptyNodeAt(oldVnode)
      console.log('firstNode', oldVnode)
    }

    if (sameVnode(oldVnode, vnode)) {
      //同一个虚拟节点,才进行精细化比较
      console.log('最外层Vnode一样', insertedVnodeQueue)
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    } else {
      //不是同一个外层节点,删掉重新创建
      elm = oldVnode.elm
      parent = api.parentNode(elm) as Node
      console.log('parent', parent)
      console.log('createElm1')
      createElm(vnode, insertedVnodeQueue)
      console.log('createElm2')

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm))
        removeVnodes(parent, [oldVnode], 0, 0)
      }
    }
    console.log('insertedVnodeQueue', insertedVnodeQueue)

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i])
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]()
    return vnode
  }
}
