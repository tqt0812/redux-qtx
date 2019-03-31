redux-qtx
=========================

redux-qtx是对redux使用方式的扩展，用更少的代码完成工作。

## 安装

```
npm install --save redux-qtx
```

状态管理以modal为单位，而一个module应具有属性：
namespace(命名空间), 
state(初始化数据+结构), 
getters(包裹一层获取state的方法), 
actions(触发state更新什么), 
reducers(处理state如何更新)
共计 5 个属性，
例如一个用户模块


```js
//用户信息状态
export default {
    namespace: "user",
    state: {
        nickName: "",
        gender: 0,
        className: "",
        likes: [],
    },
    getters: {
        //获取性别
        userGender(state) {
            return state.gender.toString() === '0' ? "男" : "女"
        },
        //班级名称
        className(state) {
            return "你猜猜"
        }
    },
    actions: {
        //初始化信息
        initInfo: (params) => async (push) => {
            let data = await getData(params)
            push("initInfo", data)
            return data
        }
    },
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
}
```

在创建store的时候, 参数reducer应该由redux-qtx来完成，当然你也可以进行扩展


```js
import { getReducers, initStore } from "redux-qtx";

let reducers = combineReducers({
    //注：调用getReducers来生成reducer,参数为模块组成的对象，多个模块则传{ userModule, otherModule, ... };
    ...getReducers([ userModal ])
});
const store = createStore(reducers)

//注：创建完成后，需要对store进行初始化，因getters这个扩展API需要用到store;
initStore(store);
```

页面使用就非常方便了。例如：


```js
import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from "react-native";
import { autoConnect, getters } from "redux-qtx";

class ReduxTest extends Component {

    componentDidMount() {
        console.log(getters("userGender"));
    }

    render() {
        return (
            <View style={ gStyle.container }>
                <Text style={{ padding: 50 }}>{ "用户性别: " + this.props.userGender }</Text>
                <TouchableOpacity onPress={ () => this.props.saveUserInfo({ gender: 0 }) }>
                    <Text style={{ padding: 50 }}>登录</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={ () => this.props.clearUserInfo() }>
                    <Text style={{ padding: 50 }}>注销</Text>
                </TouchableOpacity>
            </View>
        )
    }
}

/* 使用方式 */
export default autoConnect(
    [ "userInfo", "userGender" ], //该参数是个getterName的数组，
    [ "saveUserInfo", "clearUserInfo" ]   //该参数是个actionName的数组，
)(ReduxTest);
```

正如上面例子所示，调用redux就变得方便多了！

## 结束语
