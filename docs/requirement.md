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

 

 

## 四 storeman合约delegation(zhanglihua) 

 

 

## 五 奖惩机制(zhaoxiaofeng) 

 

 

## 六 与pos的结合(zhangwei) 

 

 

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
1) openstoreman group 的任期是固定的, 还是人工控制的, 现在下一期的storeman是自动的(写在合约里的),还是需要人发交易发起.
2) 在某个时间窗口, 允许注册打钱, 没有退出机制, 选不上的自动退钱. storeman任期结束自动退款(Yes or No)
3) 奖励的分配, 是合约自动处理的的, 还是线下有人工发起的. (应该是人工算好了奖励,发送交易执行的, 原因是storeman的工作情况存储在MPC里面, 合约是拿不到的.) 同样的问题, 退还本金的数额,是否是中心化控制的.
4) 私钥片段和nodekey是leader生成后, 线下发给别人的, 与合约无关(YES)

 
