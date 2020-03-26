# Openstoreman需求分析文档 

|date      |revise             |  
|----      |----               |  
|2020-3-2  |initial version    |  
|2020-3-23 |更新合约接口, 附录疑问 |  
## 一 简介 

openstoreman是storeman开放的实现方案.  在现存的storeman方案中, storeman不能开放或者只能开放很少的几个, 不然会导致安全性和可用性问题.  

openstoreman主要做了签名方案的替换, 用schnorr签名替换了ECDSA签名.  schnorr签名已经在EOS跨链中实现了. 但是在openstoreman中, 需要支持激励和惩罚,需要对现有的schnorr算法做一些增强. 

另外,openstoreman需要用户注资,包括partin功能, 这些通过标准的solidity合约实现.  

 

## 二 项目需求 

项目需要实现如下需求.  

* storeman合约逻辑的编写.  
涉及storeman注册，选择，storeman group更新，押金的管理等等逻辑 

* 惩罚机制   
要把以前的schnorr签名机制加点东西进去，使得中间互相发送的数据正确性能够得到验证(zhaoxiaofeng) 

* 普通storeman节点的partin.
 

## 三 storeman合约和partin 

需要支持多个storemanGroup.  
基金会控制发起storemanGroup的注册. 当基金会认为需要发起一轮新的storemanGroup注册时, 发送一条交易(registerStart). 这条交易可以指定内定的节点的数量和enodeId. 其他人参与stakeIn,提供自己节点的enodeId, 同时打钱,指定是否复用pos资金. 如果以前的storemanGroup没人退出, 则storemanGroup数量多一组. 如果有人退出, 则相应的那组storemanGroup解散, 在refund交易中完成退款和奖励发放.而不退出的那些人, 自动进入新的备选组参与竞选.    
当所有成员选择好以后, 所有的节点的enodeId就确定好了(此处EOS的mpc里需要修改, 去掉需要leader的IP要求)

storemanGroup组织好以后, Leader发起产生公共私钥的过程,同时要收集所有人的一个签名. Leader把私钥对应的地址或者公钥提交给合约,同时提交所有人的签名. 成功后, 钱包就可以看到这个storemanGroup了.


![注册流程图](./openstoreman.jpg)


* stakeIn  
参与者通过这个接口加入openstoreman计划.
这个接口完成如下功能
    - 打钱
    - 注册自己的enodeID.
    - partin的手续费. 单位是万分之. 范围是 1 ~ 9999
```
function stakeIn(uint groupIndex,bytes enodeID, uint fee)
```
资金默认自动续期, 不想续期的话, 在退出时间窗口, 发送stakeOut交易声明退出.

* stakeOut  
声明退出openstoreman计划, 只能在特定的时间窗口执行
```
function stakeOut(uint groupIndex, bytes enodeID)
```

* refund  
storeman 任期结束后退款及发放奖励.
未声明退出者, 不退款, 继续参与下一期.
只能由合约owner或group Leader发起.
```
function refund(uint groupIndex)
```
* registerStart:  
 开放注册窗口, 允许注册(stakeIn,  partIn)  
 可以指定如下参数
    - group的编号.
    - 内定节点的enodeId数组
    - storeman工作时长
    - 开放注册窗口的时间长度.
    - 支持的token及对应的汇率,所有的token共享保证金额度.  
    同时要注入内定节点的资金. 

```
 function registerStart(uint groupIndex, bytes[] enodeIDs, uint workDuration, uint registerDuration, maping(string=>uint) ratio)   
 ```

* changeRatio  
修改已经存在的group的汇率.  group自动更新后生效.
```
function changeRatio(uint groupIndex, maping(string=>uint) ratio)
```


* registerStop  
结束注册窗口,   
生成被选中的注册者列表, 未选中的退款;   
同时禁止对该group执行如下交易: stakeIn,  partIn  
```
function registerStop(uint groupIndex)
```

* partIn  
参与某个group中的某节点.
委托资金:自有资金为10:1  
可以发起的时间段有疑问, 见附录
```
function partIn(uint groupIndex, bytes enodeID)
```

* partout
退出代理.

```
function partOut(uint groupIndex, bytes enodeID)
```

 
## 生成共享私钥的过程上链.
1. 对应的合约
2. 过程的发起放到storemanAgetn里面, 根据事件自动响应. 

## 奖励过程根据pos的收益动态计算.
 

## 五 奖惩机制(zhaoxiaofeng) 

1. 提供一个api接口输出工作记录. 
1. 在提交HTLC合约时同时提交工作记录给合约, 
正常情况下只需要提交没有工作的节点编号. 有人作恶是需要提交作恶的证据.
需要明确我们能支持哪些作恶? 



## 七项目依赖 

目前实现schnorr签名的只有EOS跨链项目, 所以需要基于EOS的框架体系. Release的时候替代EOS跨链项目 

 

## 八 客户端工具 

客户端工具需要 

1) 轻钱包 

2) 离线钱包 

3) 网页版.(类似wan涨跌Dapp) 

 

## 九  浏览器 

浏览器需要能显示参与storeman和partin的信息, 类似POS部分.  

 
## 附录: 疑问

 已确定问题
1. 资金不复用pos部分, 但激励与pos收益率挂钩.
1. mpc收集签名的过程, 等待一段时间，等到leader收集所有的碎片，以前是等到17个就不等了。
1. storeman周期固定为90天. 
1. 需要支持自动续期.
1. 支持partin
1. 支持多组相同功能的group同时存在. 
1. 记录最大惩罚次数, 达到后, 不再使用此节点的数据.
1. 工作记录和HTLC跨链一起提交. 
合约不限制提交资格, 但是算法保证只有Leader能提交数据.
如果有人作恶, 提交证据
如果没人做恶, 提交未发送数据的节点编号.
1. 不做侧链方案.
1. 白名单节点也需要注入保证金. 
1. leader不交付跨连权限的交易。Leader不发起平账交易, 怎么办?
方案: 忽略这个问题.Leader是基金会控制的, 不会不发起平账的.
1. 奖励的分配, 是合约自动处理的的   
Leader发送每一次联合签名的记录, 由合约计算奖励明细.  
在storeman工作期满, 发送结算交易,一次性发放. 如果storemanGroup需要解散, 则退回本金.
1. 生成密钥的过程在链上.


未确定问题.


1. 平账流程(资产和债务，怎么决定平账给谁的问题)
方案1:  
不做平账.   
转入的token是所有storeman共享的. 只要不超出自己的额度即可.
方案2:   
假定新的group肯定能接受上一个group的债务和资金, 需要人工保证.



1. 代理部分, 是否可以等group生成后才允许代理.
坏处是节点要较多的本金才能被选入openstoreman. 
好处是不会参与了没有被选上. 而且没有如下问题:
partin资金是否计入保证金。 
方案1: partin资金只参与分红, 不参与选择storeman.    
方案2: partin资金也参与选择storeman节点. 后果是大家可能都会把资金变成partin.  


