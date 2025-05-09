# Openstoreman需求分析文档 

|date      |revise             |  
|----      |----               |  
|2020-3-2  |initial version    |  
|2020-3-23 | 更新合约接口附录疑问 |  
|2020-3-31 | 更新注册接口        |
|2025-5-9  | 更新接口,删除无用部分|

## 一 简介 

openstoreman是storeman开放的实现方案.  在现存的storeman方案中, storeman不能开放或者只能开放很少的几个, 不然会导致安全性和可用性问题.  

openstoreman主要做了签名方案的替换, 用schnorr签名替换了ECDSA签名.  schnorr签名已经在EOS跨链中实现了. 但是在openstoreman中, 需要支持激励和惩罚,需要对现有的schnorr算法做一些增强. 

另外,openstoreman需要用户注资,包括delegateIn功能, 这些通过标准的solidity合约实现.  

 

## 二 项目需求 

项目需要实现如下需求.  

* storeman合约逻辑的编写.  
涉及storeman注册，选择，storeman group更新，押金的管理等等逻辑 

* 惩罚机制   
要把以前的schnorr签名机制加点东西进去，使得中间互相发送的数据正确性能够得到验证 

* 普通storeman节点的delegateIn.
 

## 三 storeman合约和delegate 

正常运行情况下, 每一个storemanGroup支持一条主链, 原生Token和合约token同时支持. 而且支持自动发现新支持的token, openstoreman的agent不需要做任何修改, 也不需要重启即可支持新增一种token.

token的Wancoin的汇率是动态的, 放到一个oracle合约里(可以由基金会维护,手动更新), 整个group的额度也是动态的, 所有的token共享wancoin保证金的额度. 跨链交易发起前,根据汇率动态计算剩余的wancoin保证金额度是否足以支撑这笔跨链交易.   

需要支持多个storemanGroup.  
基金会控制发起storemanGroup的注册. 当基金会认为需要发起一轮新的storemanGroup注册时, 发送一条交易(storemanGroupRegisterStart). 这条交易可以指定内定的节点的数量和enodeId等信息. 参与人通过stakeIn,提供自己节点的enodeId,pk, 同时打钱. 如果有人退出, 在完成退款和奖励惩罚的结算,然后由相关人自己claim提取收益.而不退出的那些人, 自动进入新的备选组参与竞选.    
当所有成员选择好以后, 所有的节点的enodeId就确定好了

storemanGroup组织好以后, Leader发起产生公共私钥的过程,生成共享私钥的过程链上完成. 成功后, 钱包就可以看到这个storemanGroup了.


![注册流程图](./openstoreman.jpg)



###  基金会发起资金募集,开始组建storemanGroup  
 接口名: storemanGroupRegisterStart:  
 作用  : 开放一个storemanGroup的注册窗口, 允许注册(stakeIn,  delegateIn)  
 需要指定如下参数:  
    - smg: StoremanGroupInput类型, storemangroup的common 信息.   
    - wkAddrs:   白名单定节点的地址数组,白名单包含内定和备选两类  
    - senders:   白名单对应的钱包地址, 只有从这个地址stake.  
其中smg是StoremanGroupInput,包含以下数据  
    - groupId:  group的ID.  
    - workTime: 起始工作时间. 从1970年开始的秒数.  
    - totalTime: storeman工作时长  
    - registerDuration: 开放注册窗口的时间长度.  
    - memberCountDesign: group设计的节点总数.  
    - threshold: group中签名需要的最小节点数.   
    - chain1: 跨链对的第一条链.  
    - chain2: 跨链对的第二条链. 
    - curve1: 跨链对的第一条链使用的曲线. 
    - curve2: 跨链对的第二条链使用的曲线. 
    - minStakeIn: 该group允许的最小投资额度.  
    - minDelegateIn: 该group允许的最小delegator投资额度.  
    - minPartIn: 该group允许的最小partner投资额度.  
    - delegateFee: 该group收取的delegate手续费.  
    - preGroupId: 上一个group编号. 如果指定了这个参数, 上一个group没有退出的人, 自动进入当前group参与竞选.     
    
注意: 这个接口里只指定了白名单,但是并不打入资金. 

``` 
function storemanGroupRegisterStart(StoremanType.StoremanGroupInput calldata smg, address[] calldata wkAddrs, address[] calldata senders)    
struct StoremanGroupInput {
    bytes32    groupId;
    bytes32    preGroupId;
    uint workTime;  // cross chain start time 
    uint totalTime; // cross chain duration. 
    uint registerDuration;
    uint memberCountDesign;
    uint threshold;
    uint chain1;
    uint chain2;
    uint curve1;
    uint curve2;
    uint minStakeIn;
    uint minDelegateIn;
    uint minPartIn;
    uint delegateFee;
}                  
```


### 基金会向storeman管理合约注入资金
接口名: contribute  
作用:   基金会向storeman管理合约注入资金  
不需要参数.  
```$xslt
function contribute()
```

### 更新storeman基础配置
接口名: updateStoremanConf  
作用:   
1. 配置备份节点的个数  
2. 配置自有资金的权重  
3. 修改最大delegation资金与stake自有资金的比值.  

需要指定如下参数:  
    -backupCount:       配置备份节点的个数  
    -standaloneWeight:  配置自有资金的权重   
    -DelegationMulti:   修改最大delegation资金与stake自有资金的比值  
```
function updateStoremanConf(uint backupCount, uint standaloneWeight, uint DelegationMulti)
```    

### 注资参与独立节点竞选  
接口名:  stakeIn  
作用  :  参与者通过这个接口加入openstoreman计划.同时打钱.  
需要指定如下参数:  
    - groupId:  groupId ID of the target group.  
    - PK:       Public key of the staker.  
    - enodeID:  enodeID Enode ID for P2P network  
```
function stakeIn(bytes32 groupId, bytes calldata PK, bytes calldata enodeID)
```
资金默认自动续期, 不想续期的话, 在退出时间窗口, 发送stakeOut交易声明退出.

### 声明退出openstoreman
接口名:  stakeOut  
作用 :   声明退出openstoreman计划, 只能在特定的时间窗口执行  
需要指定如下参数:  
    - wkAddr: Work address of the staker    
```
function stakeOut(address wkAddr)
```

### 参与代理
接口名: delegateIn  
作用:   参与代理到某个节点.  
需要指定如下参数:  
    - wkAddr: Work address of the delegator    
```
function delegateIn(address wkAddr)
```

### 退出代理
接口名: delegateOut  
作用: 退出代理.  
需要指定如下参数:  
    - wkAddr: Work address of the delegator  
```
function delegateOut(address wkAddr)
```

### 提取收益或退款
接口名: stakeClaim  
作用:   group工作周期结束后或者竞选节点失败后提取收益或本金.  
需要指定如下参数:  
    - wkAddr: Work address of the claimant    

注意: 发起的地址必须是当初资金注入时的钱包地址.
```
function stakeClaim(address wkAddr)
```

### 提取收益或退款
接口名: delegateClaim  
作用:   group工作周期结束后delegator提取收益或本金.  
需要指定如下参数:  
    - wkAddr: Work address of the claimant    

注意: 发起的地址必须是当初资金注入时的钱包地址. 
```
function delegateClaim(address wkAddr)
```

## 生成共享私钥的过程上链.
1. 对应的合约
2. 过程的发起放到storemanAgent里面, 根据事件自动响应. 

## 奖励过程根据pos的收益动态计算.
 

## 五 奖惩机制

1. 提供一个api接口输出工作记录. 
1. 在提交Bridge合约时同时提交工作记录给合约, 
正常情况下只需要提交没有工作的节点编号. 有人作恶是需要提交作恶的证据.



## 七项目依赖 

目前实现schnorr签名的只有EOS跨链项目, 所以需要基于EOS的框架体系. Release的时候替代EOS跨链项目 

 

## 八 客户端工具 

客户端工具需要 

1) 轻钱包 

2) 离线钱包 

3) 网页版.(类似wan涨跌Dapp) 

 

## 九  浏览器 

浏览器需要能显示参与storeman和delegateIn的信息, 类似POS部分.  

 


