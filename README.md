redux-qtx
=========================

redux-qtx是对redux使用方式的扩展，用更少的代码完成工作。

## 安装

```
npm install --save redux-qtx
```

### 状态管理以modal为单位，而一个modal应具有属性：

#### namespace (命名空间), 
* 该属性自动生成type字段前缀，如：type: "user/initInfo"
```js
namespace: "user"
```

#### state (初始化数据+结构), 
* 该属性可用于reducer处理时state的初始化数据，
* 还可以形如："user.nickName" 这样快速访问state.nickName的值
```js
state: {
    nickName: "",
    gender: 0,
    className: "",
    likes: [],
}
```

#### getters (包裹一层获取state数据的方法), 
* 该属性主要是getter处理函数的映射，处理函数的唯一参数为：state，
```js
//获取性别
getters: {
    userGender(state) {
        return state.gender + "" === "0" ? "男" : "女"
    },
    className(state) {
        return "你猜猜"
    }
}
```

#### actions (主要用于触发state更新), 
* 该属性主要是action触发函数的映射，返回值为payload
* action的触发函数名与reducer处理函数名对应
* 当返回的是个函数时，该函数的唯一参数为push
* push为一个包装函数，接收两个参数：reducer处理函数名参数 和 payload
```js
actions: {
    //添加兴趣爱好
    addLike: (likeName) => likeName,
    //初始化信息
    initInfo: (params) => async (push) => {
        let data = await getData(params)
        push("initInfo", data)
        return data
    }
}
```

#### reducers (处理state如何更新), 
* 该属性主要是reducer处理函数的映射，接收两个参数：state 和 payload
* 处理函数返回新的state
```js
reducers: {
    //初始化信息
    initInfo(state, initState) {
        return { ...initState }
    },
    //添加兴趣爱好
    addLike(state, likeName) {
        let likes = state.likes.slice(0)
        if(likes.indexOf(likeName) === -1) likes.push(likeName)
        return { ...state, likes }
    }
}
```

### 接下来是redux-qtx提供的几个API

#### getReducers (生成reducer), 
#### initStore (对store实例进行初始化), 
```js
import { combineReducers, createStore } from "redux";
import { getReducers, initStore } from "redux-qtx";

let reducers = combineReducers({
    //注：调用getReducers来生成reducer,参数为模块组成的对象，多个模块则传[ userModule, otherModul, ... ];
    ...getReducers([ userModal ])
    //注：再次你也可以添加原始的reducer
});
const store = createStore(reducers)

//注：创建完成后，需要对store进行初始化，因getter, action 扩展API需要用到store;
initStore(store);
```

#### autoConnect (自动连接redux与react函数), 
* 形如react-redux的connect，但是导入的mapStateToProps, mapDispatchToProps参数形式大不一样了
* mapStateToProps出现同名时，优先级: getter函数 > state属性
* mapDispatchToProps出现同名时，优先级: action函数 > reducer函数
```js
export default autoConnect(
    [ 
        "userGender",       //导入对应的getter函数,    => "userGender"
        "user.getters"      //导入user下的全部getter函数, => "userGender", "className"
        "user.nickName",    //导入user下的对应的state属性, => "nickName"
        "user.*",           //导入user下的全部state属性, => "nickName", "gender", "className", "likes"
    ],
    [ 
        "addLike",          //导入对应的action函数,    => "addLike"
        "user.actions",     //导入user下的全部action函数, => "addLike, initInfo"
        "user.initInfo"     //导入user下的对应的reducer函数, => "initInfo"
        "user.*"            //导入user下的全部reducer函数, => "addLike", "initInfo"
    ]
)(UserComponent)
```

#### getter (获取state数据), 
```js
import { getter } from "redux-qtx"
const userGender = getter("userGender")
const className = getter("user.className")
```

#### action (触发更新state数据), 
```js
import { action } from "redux-qtx"
//无需返回值
action("addLike")("游泳")
action("user.addLike")("游泳")
//需要返回值
let initInfo = async (params) => {
    let info = await action("initInfo")(params)
    console.log(info)
}
initInfo(...)
```

## 结束语
