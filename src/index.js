/*
 * @Author tqt 
 * @DateTime 2019-02-24 12:27:16 
 * desc [主要是对redux react-redux的封装, 让使用更加方便，倾向vuex]
 */
import { connect } from "react-redux";

const box = {
    store: null,
    getterMap: {},
    actionMap: {},
}

/**
 * desc [初始化并返回reducers]
 */
export let getReducers = (moduleMap) => {
    let reducerMap = {};
    Object.keys(moduleMap).forEach((key) => {
        //组合getters
        let getterMap = moduleMap[key].getter;
        Object.keys(getterMap).forEach((getterName) => {
            if(box.getterMap[getterName] !== undefined) throw new Error(`出现重复getter: ${ getterName }`);
            box.getterMap[getterName] = {
                state: key,
                getter: getterMap[getterName]
            }
        });

        //组合actions
        let actionMap = moduleMap[key].action;
        Object.keys(actionMap).forEach((actionName) => {
            if(box.actionMap[actionName] !== undefined) throw new Error(`出现重复action: ${ actionName }`);
            box.actionMap[actionName] = actionMap[actionName]
        });

        //组合reducers
        reducerMap[key] = moduleMap[key].reducer;
    });
    return reducerMap;
}

/**
 * desc [映射getter用于获取state]
 */
export let mapGetter = (getterNames) => (state) => {
    let map = {};
    getterNames.forEach((getterName) => {
        let target = box.getterMap[getterName];
        if(target === undefined) throw new Error(`没有目标getter: ${ getterName }`)
        map[getterName] = target.getter(state[target.state]);
    })
    return map;
}

/**
 * desc [映射action用于分发dispatch]
 */
export let mapAction = (actionNames) => (dispatch) => {
    let map = {};
    actionNames.forEach((actionName) => {
        let action = box.actionMap[actionName];
        if(action === undefined) throw new Error(`没有目标action: ${ actionName }`)
        map[actionName] = (...args) => dispatch(action(...args));
    })
    return map;
}

/**
 * desc [对connect进行的扩展]
 */
export let autoConnect = (getterNames, actionNames) => (componentName) => {
    return connect(mapGetter(getterNames), mapAction(actionNames))(componentName);
}

/**
 * desc [对数据获取进行扩展，考虑不允许用户传参，影响结果]
 */
export let getters = (getterName) => {
    if(!box.store) throw new Error(`请调用initStore初始化store`)
    let target = box.getterMap[getterName];
    if(target === undefined) throw new Error(`没有目标getter: ${ getterName }`)
    return target.getter(box.store.getState()[target.state]);
}

/**
 * desc [初始化store]
 */
export let initStore = (store) => box.store = store;
