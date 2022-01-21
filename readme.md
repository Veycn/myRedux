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

## enhancer
enhancer 主要的作用是对 createStore 返回的参数进行增强，enhancer 必须是一个函数。

下面的例子是在 enhancer 中 对 dispatch 进行了增强，可以用来处理 异步事务了。
```javascript
function enhancer(createStore){
        return function (reducer, preloadedState){
            // 调用 createStore 创建一个普通的 store
            const store = createStore(reducer, preloadedState)

            // 拿到 dispatch 进行争强，赋予 dispatch 处理异步事物的能力
            // action 除了可以传递 普通对象，还可以传递一个函数
            const dispatch = store.dispatch
            const _dispatch = function (action){
                // 如果 action 是一个函数，调用它，将 dispatch 传递过去
                // 在这个函数中，合适的时候再触发 dispatch
                if (typeof action === 'function'){
                    return action(dispatch)
                }
                // 普通对象，直接 dispatch
                dispatch(action)
            }

            return {
                ...store,
                // 用增强之后的 _dispatch 覆盖之前的 dispatch
                dispatch: _dispatch
            }
        }
    }
```

## 中间件

在视图中触发 `action` 的时候，按照正常的 `redux` 工作流程，会被 `reducer` 接收到。
加入了中间件以后， `action` 会先被中间件处理，一个个 中间件执行完毕之后，才会传递给 `reducer` 

中间件就是方便我们在 action 触发之后，reducer 接收之前去做一些事情。本质上，中间件就是对 dispatch 函数进行增强，如 `thunk` 提供了处理异步的能力。

中间件是这个样子的：
```javascript
// store: { getState, dispatch }
function logger(store){
    // next 参数即下一个中间件函数
    // 或者是 dispatch(最后一个中间件的 next 为 dispatch，触发 reducer)
    return function (next){
        return function (action){
            // 此处的内容是这个中间件核心逻辑
            console.log('logger')
            next(action)
        }
    }
}
// 外层两个函数用来接收参数
```

## applyMiddleware
在 redux 中，提供了一个中间件核心 API， `applyMiddleware`。它可以让多个中间件进行组合。 

> 记住 applyMiddleware 的本质是 createStore 中的 enhancer，它是为了增强 dispatch 函数。以便我们在更新状态之前去做一些事情。


```javascript
var store = createStore(reducer, {}, applyMiddleware(logger, thunk))
```

中间件会按照注册顺序逐个执行。最后把结果交给 reducer。

```javascript

// 中间件个数不确定，用 middlewares 参数收集

function applyMiddleware(...middlewares) {
    // createStore(reducer, {}, enhancer)
    // createStore(reducer, {}, applyMiddleware(logger, thunk))
    // applyMiddleware 这里是函数调用，
    // 在内部需要返回一个函数，这个函数用于接收 createStore
    // 在 applyMiddleware 内部创建 store 并返回
    return function (createStore) {
        // 内部还要返回一个函数用于接收 createStore 的参数， reducer 和 preloadedState
        return function (reducer, preloadedState) {
            // 调用传递过来的这些中间件
            // 创建 store
            const store = createStore(reducer, preloadedState)
            // 中间件中的 store 只有 getState 和 dispatch 方法
            const middlewareApi = {
                getState: store.getState,
                dispatch: store.dispatch,
            }
            // 调用中间件的第一层函数，传递 阉割版的 store 对象
            const chain = middlewares.map(middleware => middleware(middlewareApi))

            // 传递第二层参数，next
            // next 是下一个中间件， 最后一个中间价的 next 是 dispatch
            const dispatch = compose(...chain)(store.dispatch)

            // 返回的这个 dispatch 是一个函数
            // 这个函数是最后一个中间件的最内层函数（也就是中间件逻辑）
            // 这个函数的参数是下一个中间件的最内层函数
            
            return {
                ...store,
                dispatch
            }
        }
    }
}


function compose() {
    const funcs = [...arguments]

    // 返回一个函数用来接收 dispatch
    return function (dispatch) {
        for (let i = funcs.length - 1; i >= 0; i--) {
            // 第一轮循环，是最后一个中间件，它的 next 是从外部传入的真正的 dispatch
            // 后面的每一轮循环，都将 dispatch 覆盖掉
            // funcs[i](dispatch) 调用之后返回值就是中间件最内层的函数
            dispatch = funcs[i](dispatch)
        }
        // 循环结束之后，dispatch 是第一个中间件的最内层函数
        // 这个 dispatch 被调用的时候，会一直 next 下去，最终执行到真正的 dispatch
        return dispatch
    }
}
```

### bindActionCreator
bindActionCreator 的作用是将 action 对象转换成可以触发 reducer 的函数。

内部的原理其实就是用 dispatch 去触发对应的 action 
```javascript
function increment (){
    return { type: 'increment' }
}

function decrement (){
    return { type: 'decrement' }
}

const actions = bindActionCreators({
    increment,
    decrement
}, dispatch)
```
本质上就是为了给每一个`action` 加上`dispatch` 。

`function increment (){
return { type: 'increment' }
} ====>  dispatch({type: 'increment'})`
```javascript
function bindActionCreators(actionCreators, dispatch) {
    const boundActionCreators = {}

    for (let key in actionCreators) {
        // // 用闭包存储 key，否则每个 action 都是最后一个 key 对应的 action，或者用 let 声明 key
        // (function (key){
        //
        // })(key)
        boundActionCreators[key] = function () {
            dispatch(actionCreators[key]())
        }
    }
    // { increment: function(){ dispatch( (function increment(){return {type: 'increment'}})() ) } }
    return boundActionCreators
}
// 返回的内容长这个样子
// {
//     increment: function Anonymous() {
//         dispatch(
//            (function increment() {
//                return {type: 'increment'}
//            })()
//         )
//     }
// }
```
接下来就可以这样使用，而不用每次都写 `dispatch({type: 'increment'})` :
```javascript
const actions = bindActionCreators({
    decrement,
    increment,

}, store.dispatch)

actions.increment()
actions.decrement()
```

### combineReducers

在 redux 中，我们可以按照业务的不同拆分成一个个小的 reducer。再通过 combineReducer 将这些小的 reducer 合并起来。

```javascript
const rootReducer = combineReducers({counter: counterReducer})
const store = createStore(rootReducer, { counter: 0 }, applyMiddleware(logger, thunk))

/**
 * 实现
 * combineReducer 接收一个参数，就是多个 reducer 组合成的一个对象
 * reducer 函数接收两个参数，state 和 action， 所以应该在内部返回一个函数, 用来接收这两个参数
 */
function combineReducer(reducers) {
    // reducers: { counter: counterReducer, modal: modalReducer }
    // 检查 reducer 类型，必须是函数
    const reducerKeys = Object.keys(reducers)
    for (let i = 0; i < reducerKeys.length; i++){
        let key = reducerKeys[i]
        if (typeof reducers[key] !== 'function'){
            throw new TypeError('reducer must be a function')
        }
    }
    // 调用一个个 reducer，将每一个 reducer 返回值存储到一个新的大对象中
    // state: { counter: 0, modal: { show: false } }
    return function (state, action){
        const nextState = {}
        for (let i = 0; i < reducerKeys.length; i++){
            let key = reducerKeys[i]            // counter
            let reducer = reducers[key]         // counterReducer
            let prevStateForKey = state[key]    // 0
            nextState[key] = reducer(prevStateForKey, action)   // nextState['counter'] = reducer(0, action)
        }
        return nextState
    }
}
```
