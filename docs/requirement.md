# Openstoreman需求分析文档 

## 一 简介 

openstoreman是storeman开放的实现方案.  在现存的storeman方案中, storeman不能开放或者只能开放很少的几个, 不然会导致安全性和可用性问题.  

openstoreman主要做了签名方案的替换, 用schnorr签名替换了ECDSA签名.  好处是可以替换任意数量的签名.  schnorr签名已经在EOS跨链中实现了. 但是在openstoreman中, 需要支持激励和惩罚,需要对现有的schnorr算法做一些增强. 

另外,openstoreman需要用户注资,包括delegation功能, 这些通过标准的solidity合约实现.  

关于奖励的分配, 因为设计的工作表现. 可能是根据工作记录线下分配. 

 

## 二 项目需求 

项目需要实现如下需求.  

第一个是storeman合约逻辑的编写，涉及storeman注册，选择，storeman group更新，押金的管理等等逻辑 

第二个是惩罚机制，要把以前的schnorr签名机制加点东西进去，使得中间互相发送的数据正确性能够得到验证(zhaoxiaofeng) 

第三个就是storeman和PoS节点的结合，就是pos节点同时担任Storeman节点，押金共用，delegation也有，同时接受pos和storeman两份收益，等等(zhangwei) 

第四个是普通storeman节点的delegation.(zhanglihua) 

 

## 三 storeman合约(jiaqinggang) 
* stakeIn  
参与者通过这个接口加入openstoreman计划.
* stakeOut  
声明退出openstoreman计划
* refund  
storeman 任期结束后退款及发放奖励.
未声明退出者, 不退款, 继续参与下一期.
* txRecord  
mpc Leader使用此接口, 发送storeman工作记录, 用于发放奖励.
* registerStart:
 开放注册窗口, 允许如下交易  
 stakeIn, stakeOut, delegateIn, delegateOut,
* registerStop  
结束注册窗口, 生成被选中的注册者列表, 未选中的退款; 同时禁止如下交易:
 stakeIn, stakeOut, delegateIn, delegateOut,


 

## 四 storeman合约delegation(zhanglihua) 
delegateIn
delegateout

 

 

## 五 奖惩机制(zhaoxiaofeng) 
1. storeman的工作记录, 放在mpc leader的数据库里.
1. 数据记录如何备份.
1. 提供一个api接口输出工作记录, 线下小工具处理. 
1. 发送交易提交工作记录给合约, 需要确定有那些数据提交.

 

 

## 六 与pos的结合(zhangwei) 
1. pos validator任期与storeman任期不一致怎么半.
1. pos delegation退出怎么办.

 

## 七项目依赖 

目前实现schnorr签名的只有EOS跨链项目, 所以需要基于EOS的框架体系. Release的时候替代EOS跨链项目 

 

## 八 客户端工具 

客户端工具需要 

1) 轻钱包 

2) 离线钱包 

3) 网页版.(类似wan涨跌Dapp) 

 

## 九  浏览器 

浏览器需要能显示参与storeman和delegation的信息, 类似POS部分.  

 
## 十 疑问

1. 奖励的分配, 是合约自动处理的的, 还是线下有人工发起的. (应该是人工算好了奖励,发送交易执行的, 原因是storeman的工作情况存储在MPC里面, 合约是拿不到的.) 同样的问题, 退还本金的数额,本金会否被扣, 是否是中心化控制的.
1. 私钥片段和nodekey是leader生成后, 线下发给别人的, 与合约无关(YES)
集资成功后, 集资人怎么证明是自己打的钱, 从而要求Leader把私钥片段发给他.
1. openstoreman group 的任期是固定的, 还是人工控制的, 发起下一期的storeman注册是自动的(写在合约里的),还是需要人发交易发起.
1. 在某个时间窗口, 允许注册打钱, 选不上的自动退钱.
1. 需要支持续约
1. delegation不能随时退出
1. delegation委托的storeman退出 则所有相关delegation退出
1. 由于storeman的工作表现只存在于leader 的MPC的数据库里, 要防止单点问题, 比如硬盘损坏. 




 
