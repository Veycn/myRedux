## redux
暴力实现一个简易的 redux
```javascript
/**
 *
 * @param reducer
 * @param preloadedState
 * @param enhancer 对 createStore 返回的参数进行增强，enhancer 必须是一个函数
 *  applyMiddleware 就是一个 enhancer
 */
function createStore(reducer, preloadedState, enhancer) {
    if (typeof reducer !== "function") {
        throw new TypeError('reducer must be a function')
    }
    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== "function") {
            throw new TypeError('enhancer must be a function')
        } else {
            // 如果传递了 enhancer，将 reducer, preloadedState 交由 enhancer 自己去创建 store
            return enhancer(createStore)(reducer, preloadedState)
        }
    }
    // store 对象中存储的状态
    let currentState = preloadedState
    // 存放订阅者函数
    let currentListeners = []

    function getState() {
        return currentState
    }

    // 触发 action
    function dispatch(action) {
        if (!isPlainObject(action)) {
            throw new TypeError('action must be a plain object')
        }
        if (typeof action.type === 'undefined') {
            throw new TypeError('action need to have a prop witch names "type"')
        }
        currentState = reducer(currentState, action)
        // dispatch 的时候，状态更新了
        // 此时需要遍历所有的订阅，执行监听函数
        for (let i = 0; i < currentListeners.length; i++) {
            let listener = currentListeners[i]
            listener()
        }
    }

    // 订阅状态
    function subscribe(listener) {
        // 通过 store.subscribe 订阅状态变化
        currentListeners.push(listener)
    }

    return {
        getState,
        dispatch,
        subscribe
    }
}

// 判断是否是一个对象
function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj == null) {
        return false
    }

    let proto = obj;
    // 沿着原型链找到顶端
    while (Object.getPrototypeOf(proto) != null) {
        proto = Object.getPrototypeOf(proto)
    }

    // 如果 obj 的原型等于顶层对象的原型，则说明 obj 是一个独行
    return Object.getPrototypeOf(obj) === proto
}

function applyMiddleware(...middlewares){

}

```
## 中间件

在视图中触发 `action` 的时候，按照正常的 `redux` 工作流程，会被 `reducer` 接收到。
加入了中间件以后， `action` 会先被中间件处理，一个个 中间件执行完毕之后，才会传递给 `reducer` 

中间件就是方便我们在 action 触发之后，reducer 接收之前去做一些事情。本质上，中间件就是对 dispatch 函数进行增强，如 `thunk` 提供了处理异步的能力。


## applyMiddleware
在 redux 中，提供了一个中间件核心 API， `applyMiddleware`。它可以让多个中间件进行组合。 
