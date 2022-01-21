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
