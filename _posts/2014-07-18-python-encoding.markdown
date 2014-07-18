---    
layout: post    
title:  "python中的字符编码"    
date:   2014-07-18 21:24:54    
categories: coding    
author: Kingo Wang
---    
    
首先，以下问题只在python 2.x中出现. python 3.x里面已经解决了这种byte和string混乱的局面    
    
python中和字符编码最相关的类型是str 和unicode        
非常容易让人迷惑的是str其实不应该叫做字符串, 它实质就是一个byte array, 而unicode才是真正的字符串        

*   str 对应于java的byte[]
*   unicode 对应于java的String
    
他们的转换关系为：        
str. decode() => unicode        
unicode.encode()=>str        
    
比较让人迷惑的是str也有encode这个方法，它实际等效于str.decode(sys.getdefaultencoding()).encode()        
sys.defaultencoding是一些默认encode和decode操作用的编码方式        
比如:        
     str(uni_obj)  等效于 uni_obj.encode(sys.getdefaultencoding())        
     unicode(str_obj) 等效于 str_obj.decode(sys.getdefaultencoding())        
sys.getdefaultencoding() 的默认值一般为ascii    
    
python 还一个默认编码值为sys.stdout.encoding, 这个作用于标准输出    
比如，print uni_obj 等效于 print uni_obj.encoding(sys.stdout.encoding)    
sys.stdout.encoding 默认值一般为utf-8    
    
造成混乱局面的主要原因是，str和unicode在很多地方可以混用    
比如    
str_obj = "测试"     
uni_obj = u"测试"    
print str_obj     #输出的都是:  测试    
print uni_obj    #    
但很多时候却又不是一样的东西：    
str_obj[0] # \xe6    
uni_obj[0] #测    
dict = {}    
dict[str_obj] 和dict[uni_obj]是不一样的东西    
但如果str_obj="ascii", uni_obj=u"ascii"时，它们又是一样的东西了    
也就是说，如果只有ascii字符，用uni_obj或str_obj是当作同一个key的    
    
还有str_ojb 和 uni_obj进行==比较时，会使用defaultencoding把str_obj转成unicode进行比较，如果无法转换时，就返回False    
这些让人迷惑的地方还有很多    
    
总结：    
python 2.X 中str 和 unicode是一个比较混乱的局面。    
在中文字符等非ascii字符存在时, 一定要清楚哪些地方要用str, 哪些地方要用unicode    
    
尽量不要把str和unicode混合使用，尤其是不清楚会进行哪些默认的encode和decode操作时    
    
据说百分之八十的金钱损失皆因使用错误的编码导致，因此务必小心谨慎。    


>2014-07-18 08:58:17 Kingo Wang:    
>This is a good post!
