import vnode from "./vnode"
//判断是是否是string和number
/**
 * 
 * let a=new String('a')
 * typeof a  //object
 * a instanceof String
 * a.toSring() //'a'
 */
function primitive(s) {
  return typeof s === "string" ||
    typeof s === "number" ||
    s instanceof String ||
    s instanceof Number;
}

export default function h(sel, b, c) {
  let data = {}
  let children
  let text

  if (c !== undefined) {
    if (b !== null) {
      data = b
    }
    if (Array.isArray(c)) {
      children = c
    } else if (primitive(c)) {
      text = c.toString()
    } else if (c && c.sel) {
      children = [c]
    }
  } else if (b !== undefined && b !== null) {
    if (Array.isArray(b)) {
      children = b
    } else if (primitive(b)) {
      text = b.toString()
    } else if (b && b.sel) {
      children = [b]
    } else {
      data = b
    }
  }
  if (children !== undefined) {
    for (let i = 0; i < children.length; ++i) {
      if (primitive(children[i]))
        children[i] = vnode(undefined, undefined, undefined, children[i], undefined)
    }
  }
  return vnode(sel, data, children, text, undefined)

};
