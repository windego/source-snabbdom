let p1 = function () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(1)
    }, 600)
  })
}
let p2 = function () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(2)
    }, 200)
  })
}
let p3 = function () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(3)
    }, 300)
  })
}

function promiseAll_test() {
  let taskList = [p1, p2, p3]
  let _promiseAll = promiseAll
  _promiseAll(taskList, 2).then((res) => {
    console.log('promiseAll_test:', res)
  })
}