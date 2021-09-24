# snabbdom 源码学习

### h

生成 Vnode

### updateChildren

主要逻辑

while 循环的比较

1. 优先处理特殊场景，先对比两端。也就是

   - 旧 vnode 头 vs 新 vnode 头
   - 旧 vnode 尾 vs 新 vnode 尾
   - 旧 vnode 头 vs 新 vnode 尾
   - 旧 vnode 尾 vs 新 vnode 头

2. 首尾不一样的情况，寻找 key 相同的节点，
   1. 找不到则新建元素
   2. 如果找到 key，但是，元素选择器变化了，也新建元素
   3. 如果找到 key，并且元素选择没变， 则移动元素
3. 两个列表对比完之后，清理多余的元素，新增添加的元素
4. 不提供 key 的情况下，如果只是顺序改变的情况，例如第一个移动到末尾。这个时候，会导致其实更新了后面的所有元素

### Hooks
