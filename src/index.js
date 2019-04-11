/*
 * @Author tqt 
 * @DateTime 2019-03-29 20:55:10 
 * @Desc [主要是对redux react-redux的封装, 让使用更加方便，倾向vuex]
 */
import { connect } from "react-redux"

const box = {
    store: null,
    names: [],
    modalMap: {}
}

/**
 * desc [初始化并返回reducers]
 */
export let getReducers = (modals=[]) => {
    let _reducers = {}
    modals.forEach(({ namespace="none", state: initState={}, getters={}, actions={}, reducers={} }) => {
        //保存modal
        if(box.names.indexOf(namespace) !== -1) throw new Error(`出现重复modal: ${ namespace }`)
        box.names.push(namespace)
        box.modalMap[namespace] = { 
            state: initState, 
            getters, 
            actions, 
            reducers 
        }
        //生成reducer
        _reducers[namespace] = (state=initState, action) => {
            let { type, payload } = action
            let reducerName = type.split("/")[1]
            return reducers[reducerName] 
                ? reducers[reducerName](state, payload) 
                : state
        }
    })
    return _reducers
}

/**
 * desc [处理优先级]
 */
export let addGetter = (getterMap, getterName, getterFunc, state, rpi) => {
    if(getterMap[getterName] !== undefined && getterMap[getterName].rpi > rpi) return
    getterMap[getterName] = { 
        getterFunc, 
        state, 
        rpi 
    }
}

/**
 * desc [处理多种参数类型，接收字符串数组]
 * 元素类型一：getterName          ->单个方法
 * 元素类型二：modalName.getters   ->全部getterName方法
 * 元素类型三：modalName.property  ->state下的单个属性方法（自动生成）
 * 元素类型四：modalName.*         ->state下的全部属性方法（自动生成）
 * 思考：很容易出现命名的冲突，设置优先级：getter > property
 */
export let mapGetter = (arr=[]) => (state) => {
    let getterMap = {};
    arr.forEach((item) => {
        let [ namespace, property ] = item.split(".")
        if (property === undefined) {
            //元素类型一
            for(let namespace of box.names) {
                let getter = box.modalMap[namespace].getters[item]
                if(getter !== undefined) {
                    return addGetter(getterMap, item, getter, state[namespace], 2)
                } 
            }
            throw new Error(`没有目标getter: ${ item }`)
        } else if(property === "getters") {
            //元素类型二
            let getters = box.modalMap[namespace].getters
            Object.keys(getters).forEach((getterName) => {
                addGetter(getterMap, getterName, getters[getterName], state[namespace], 2)
            })
        } else if(property !== "*") {
            //元素类型三
            addGetter(getterMap, property, () => state[namespace][property], undefined, 1)
        } else {
            //元素类型四
            let initState = box.modalMap[namespace].state
            Object.keys(initState).forEach((property) => {
                addGetter(getterMap, property, () => state[namespace][property], undefined, 1)
            });
        }
    })
    return Object.keys(getterMap).reduce((mapStateToProps, getterName) => {
        let { getterFunc, state } = getterMap[getterName]
        mapStateToProps[getterName] = getterFunc(state)
        return mapStateToProps
    }, {})
}

/**
 * desc [生成type，结构：`${namespace}/${reducerName}`]
 */
export let getType = (namespace, reducerName) => `${namespace}/${reducerName}`

/**
 * desc [处理分发，对dispatch包裹一层]
 */
export let dispatchPack = (dispatch, action, namespace, reducerName) => (...args) => {
    let result = action(...args)
    if(result instanceof Function) {
        //异步action
        return result((reducerName, payload) => {
            dispatch({
                type: getType(namespace, reducerName),
                payload
            })
        })
    } else {
        //同步action
        return dispatch({
            type: getType(namespace, reducerName),
            payload: result
        })
    }
}

/**
 * desc [处理优先级]
 */
export let addAction = (actionMap, actionName, actionFunc, rpi) => {
    if(actionMap[actionName] !== undefined && actionMap[actionName].rpi > rpi) return
    actionMap[actionName] = { 
        actionFunc, 
        rpi 
    }
}

/**
 * desc [映射action用于分发dispatch]
 * 元素类型一：actionName          ->单个方法
 * 元素类型二：modalName.actions   ->全部actionName方法
 * 元素类型三：modalName.reducer   ->reducers下的单个方法（自动生成）
 * 元素类型四：modalName.*         ->reducers下的全部方法（自动生成）
 * 思考：很容易出现命名的冲突，设置优先级：action > reducer
 */
export let mapAction = (arr=[]) => (dispatch) => {
    let actionMap = {}
    arr.forEach((item) => {
        let [ namespace, property ] = item.split(".");
        if (property === undefined) {
            //元素类型一
            for(let namespace of box.names) {
                let action = box.modalMap[namespace].actions[item]
                if(action !== undefined) {
                    let actionFunc = dispatchPack(dispatch, action, namespace, item)
                    return addAction(actionMap, item, actionFunc, 2)
                } 
            }
            throw new Error(`没有目标action: ${ item }`)
        } else if(property === "actions") {
            //元素类型二
            let actions = box.modalMap[namespace].actions
            Object.keys(actions).forEach((actionName) => {
                let actionFunc = dispatchPack(dispatch, actions[actionName], namespace, actionName)
                addAction(actionMap, actionName, actionFunc, 2)
            })
        } else if(property !== "*") {
            //元素类型三
            addAction(actionMap, property, (payload) => dispatch({
                type: getType(namespace, property),
                payload
            }), 1)
        } else {
            //元素类型四
            let reducers = box.modalMap[namespace].reducers
            Object.keys(reducers).forEach((reducerName) => {
                addAction(actionMap, reducerName, (payload) => dispatch({
                    type: getType(namespace, reducerName),
                    payload
                }), 1)
            })
        }
    })
    return Object.keys(actionMap).reduce((mapDispatchToProps, actionName) => {
        mapDispatchToProps[actionName] = actionMap[actionName].actionFunc
        return mapDispatchToProps
    }, {})
}

/**
 * desc [对connect进行的扩展]
 */
export let autoConnect = (getterNames, actionNames) => (componentName) => {
    return connect(mapGetter(getterNames), mapAction(actionNames))(componentName);
}

/**
 * desc [对数据获取进行扩展，考虑不允许用户传参，影响结果]
 * 参数类型一：getterName          ->单个方法
 * 参数类型二：modalName.property  ->state下的单个属性方法（自动生成）
 */
export let getter = (str) => {
    let arr = str.split(".")
    if(arr.length === 1) {
        //参数类型一
        let getterName = str
        for(let namespace of box.names) {
            let getterFunc = box.modalMap[namespace].getters[getterName]
            if(getterFunc !== undefined) {
                return getterFunc(box.store.getState()[namespace])
            }
        }
        throw new Error(`没有目标getter: ${ getterName }`)
    } else if(arr.length === 2) {
        //参数类型二
        let [ namespace, getterName ] = arr
        let getterFunc = box.modalMap[namespace].getters[getterName]
        return getterFunc(box.store.getState()[namespace])
    } else {
        throw new Error(`异常参数: ${ str }`)
    }
}

/**
 * desc [对数据获取进行扩展，考虑不允许用户传参，影响结果]
 * 参数类型一：actionName          ->单个方法
 * 参数类型三：modalName.reducer   ->reducers下的单个方法（自动生成）
 */
export let action = (str) => (payload) => {
    let arr = str.split(".")
    if(arr.length === 1) {
        //参数类型一
        let actionName = str
        for(let namespace of box.names) {
            let _action = box.modalMap[namespace].actions[actionName]
            if(_action !== undefined) {
                return dispatchPack(box.store.dispatch, _action, namespace)(payload)
            }
        }
        throw new Error(`没有目标action: ${ actionName }`)
    } else if(arr.length === 2) {
        //参数类型二
        let [ namespace, actionName ] = arr
        let _action = box.modalMap[namespace].actions[actionName]
        return dispatchPack(box.store.dispatch, _action, namespace)(payload)
    } else {
        throw new Error(`异常参数: ${ str }`)
    }
}

/**
 * desc [初始化store]
 */
export let initStore = (store) => box.store = store;