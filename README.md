# ladengApp-API

拉登应用发布新系统API；

### Development

```bash
$ npm i
$ npm run dev
$ open http://localhost:7001/
```

### Deploy

```bash
$ npm start
$ npm stop
```

# 拉登权限管理机制
## 引言
权限，可分为“功能（操作）权限”和数据权限两种，在系统中，两种权限应当同时有效。例如，在windows系统中，某用户具有新建一个文件的功能权限，该用户在C盘没有写权限，但在D盘有写权限；则该用户不能把他创建的文件保存在C盘而只能保存在D盘。
   在上述例子中，能否创建文件是由功能权限来控制的，能否保存文件是由数据权限进行控制的。只有两者同时有效，用户的业务才能顺利进行。
	简单地说，权限管理就是对资源的管理。权限管理的目的就是建立分配资源的规则，以便用户能够通过这套规则，获取他们应该获得的资源。

------
[TOC]

## 定义
-  功能权限：也叫操作权限，指的是允许或拒绝用户使用系统提供的某个功能。
-  数据权限：指的是允许或拒绝用户进行某个数据的增删改查操作。
-  授权：指的是分配具体的权限给具体的人。
-  鉴权：指的是对具体人的行为，根据权限规则进行合法性鉴别。
### 授权的基本原则
对于授权来说，需要定义的有且只有权限和授权对象两个要素。简而述之，对于功能操作就是“什么功能授权给哪个用户来操作”。同样，对于数据，就是“什么数据授权给哪个用户来操作”。
一般情况下，我们并不会对单一的功能/数据进行单用户的授权管理，因为这样用户操作起来显然非常麻烦。为了方便和简化操作，一般的授权规则是：
哪些功能/数据授权给哪些用户
### 授权的一般方法
在实际的授权管理中，我们总是根据业务的需求，将一些在业务上不可分割的、需要允许用户一起使用的功能，组合成一个权限集合进行统一授权。对于这样的权限集合，我们一般称之为“角色”。也就是说，我们通过角色来定义用户被允许使用哪些功能和访问哪些数据。当然，我们一般把功能和数据分开来进行授权，以便获得更加灵活的权限规则配置方法，以适应更广泛的授权需求。
由于某些不同用户在该业务上需要具有相同的权限，那么这些不同的用户在特定的业务上就具有了共性，可以作为一个抽象的用户来进行权限的授予。授权管理使用的抽象的用户，也就是用户集合，除了普遍使用的“用户组”外，还可以引用别的业务中所使用的对象。例如组织机构管理中的“机构/部门”、“职位”和工作流中使用的“岗位”等，在授权管理中都是作为用户集合使用，本质毫无二致。
通过让抽象的用户扮演角色，即可使这个抽象的用户所代表的真实用户获得完成业务所需的权限。通过这样的方式，可以简化授权管理，方便用户操作。
## 授权管理
将特定的权限授予特定的人群的过程，我们称之为“授权”。为了能够方便地进行授权操作，我们必须要有一个能够提供合理授权方法的用户界面。
### 功能权限的授权
对于一个可扩展的系统来说，意味着功能是不断变化的。为了适应这种不能事先确定的变化，必须将功能权限进行分散管理。分散管理的好处如下：
-  天然地支持业务的动态变化，系统实现简单。
-  权限的调整范围可控制在局部范围，方便权限的管理和操作。
#### 例外权限的授予
如果某个特定用户张三需要额外的一个权限，那么新建一个允许该功能操作的角色，并让张三成为该角色成员即可使张三拥有额外的权限。
如果某个特定用户李四需要比同一项目组的其他人少一个权限，那么新建一个拒绝该功能操作的角色，并让李四成为该角色成员即可使李四不能进行该项操作。因为在鉴权过程中，拒绝的优先级要高于允许。
### 数据权限的授权
数据在系统中共同的特性有如下维度：
- 业务维度：不同的业务产生不同的数据
-  生产者维度：相同的业务会有多个数据生产者和生产部门
有些业务需要用户访问其他业务的数据，或者是其他数据生产者中特定生产者的生产的数据。简单的说，就是数据权限的授予必须支持跨业务和跨部门。
#### 一般权限的授予
由于数据的特殊性质，实际上在有限范围内的授权比功能权限的授予更加方便。因为生产部门和生产者具有天然的分类属性，所以象“本机构”、“本部门”、“本人”这些对生产者维度的进一步抽象就有了用武之地。
在不对业务维度做限定的情况下，就可以配置例如“允许本部门的成员管理（增删改查）本部门的数据”这样的权限规则。那么对于不同部门的用户，这条共同的规则所产生的效果并不相同，具体的效果是与用户所在的部门的业务和产生的数据相对应的。
根据以上分析，我们可以内置一些抽象规则，例如：
- 允许管理本机构（含下级机构/部门）的数据
- 允许管理本部门（含下级部门）的数据
- 仅允许管理本部门的数据
- 仅允许管理本人的数据
- 允许查看本机构（含下级机构/部门）的数据
- 允许查看本部门（含下级部门）的数据
- 仅允许查看本部门的数据
- 仅允许查看本人的数据
#### 自定义权限的授予
一般数据权限的授予只能局限于符合高度抽象规则所限定的范围。如果要在这个范围之外的数据进行授权，例如想让财务部的人访问采购部的数据，显然是一般数据授权所不能支持的。
这个时候，我们就必须要提供用户在角色中自由定义允许或禁止用户访问的数据集的方法。上面说过，一个数据需要在业务和生产者两个维度上进行描述，才能确定数据。那么在定义角色所允许访问的数据集时，因为授权分散在不同的业务中，所以业务是确定的，剩下的就是需要指定一个或多个生产者。在这里，生产者可以使用抽象方法进行归纳分类。
最后，类同于功能权限的授权方式，我们把定义好的角色分配给一个抽象的用户即可将一个自定义的数据权限授予抽象用户代表的真实用户。
## 权限管理的实现
权限管理的具体实现方法，离不开数据结构的支持。相对来说，有具体的数据结构，我们也更容易理解权限的管理机制。在讨论权限之前，我们还需要先了解权限管理的对象：功能资源和数据资源。这些资源同样需要一个数据结构去进行定义。
### 组织机构和用户
组织机构表：
```sql
CREATE TABLE Sys_Organization(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_Organization UNIQUE CLUSTERED IDENTITY(1,1),                               --自增序列  
[ParentId]         VARCHAR(36),                                                                                        --父节点ID  
[NodeType]         INT NOT NULL,                                                                                       --节点类型：1、机构；2、部门；3、职位  
[Index]            INT,                                                                                                --序号  
[Code]             VARCHAR(32),                                                                                        --编码  
[Name]             NVARCHAR(32) NOT NULL,                                                                              --名称  
[Alias]            NVARCHAR(16),                                                                                       --别名/简称  
[FullName]         NVARCHAR(32),                                                                                       --全称  
[PostId]           VARCHAR(36),                                                                                        --岗位ID，字典  
[Validity]         BIT DEFAULT 0 NOT NULL,                                                                             --是否有效：0、无效；1、有效  
[CreatorUserId]    VARCHAR(36),                                                                                        --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO  
```
用户表：
```sql
CREATE TABLE Sys_User(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED,                                                               --此ID与主数据ID相同  
[SN]               BIGINT CONSTRAINT IX_Sys_User UNIQUE CLUSTERED IDENTITY(1,1),                                       --自增序列  
[Name]             NVARCHAR(16) NOT NULL,                                                                              --用户名  
[LoginName]        VARCHAR(36) NOT NULL,                                                                               --登录名  
[Password]         VARCHAR(32) DEFAULT 'e10adc3949ba59abbe56e057f20f883e' NOT NULL,                                    --登录密码，保存密码的MD5值，初始密码123456  
[Description]      NVARCHAR(MAX),                                                                                      --描述  
[BuiltIn]          BIT DEFAULT 0 NOT NULL,                                                                             --是否预置：0、自定；1、预置  
[Validity]         BIT DEFAULT 0 NOT NULL,                                                                             --是否有效：0、无效；1、有效  
[CreatorUserId]    VARCHAR(36),                                                                                        --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO  
```
### 资源
#### 模块和功能
```sql
CREATE TABLE Sys_Module(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_Module UNIQUE CLUSTERED IDENTITY(1,1),                                     --自增序列  
[ParentId]         VARCHAR(36),                                                                                        --父模块ID  
[Level]            INT NOT NULL,                                                                                       --模块级别：0、主窗体模块；1、普通业务模块；2、业务子模块  
[Name]             NVARCHAR(64) NOT NULL,                                                                              --名称  
[Location]         VARCHAR(MAX) NOT NULL,                                                                              --文件安装路径  
[DataTable]        NVARCHAR(64),                                                                                       --模块主数据表名称  
[Description]      NVARCHAR(MAX),                                                                                      --描述  
[RegisterTime]     DATETIME DEFAULT GETDATE() NOT NULL                                                                 --模块注册时间  
)  
GO 
```
模块功能表：
```sql
CREATE TABLE Sys_ModuleAction(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_ModuleAction UNIQUE CLUSTERED IDENTITY(1,1),                               --自增序列  
[ModuleId]         VARCHAR(36) FOREIGN KEY REFERENCES Sys_Module(ID) ON DELETE CASCADE NOT NULL,                       --模块注册ID  
[Name]             NVARCHAR(64) NOT NULL,                                                                              --名称  
[SubModuleId]      VARCHAR(36) FOREIGN KEY REFERENCES Sys_Module(ID),                                                  --子模块ID（功能作为子模块入口时）  
[Description]      NVARCHAR(MAX)                                                                                       --描述  
)  
GO  
```
#### 业务数据
物资数据表：
```sql
CREATE TABLE MDG_Material(  
[MID]              VARCHAR(36) PRIMARY KEY NONCLUSTERED FOREIGN KEY REFERENCES MasterData(ID) ON DELETE CASCADE,       --主数据索引ID  
[SN]               BIGINT CONSTRAINT IX_MDG_Material UNIQUE CLUSTERED IDENTITY(1,1),                                   --自增序列  
[Index]            INT,                                                                                                --序号  
[BarCode]          VARCHAR(16),                                                                                        --条形码  
[Brand]            NVARCHAR(16),                                                                                       --品牌  
[Model]            NVARCHAR(32),                                                                                       --型号  
[Size]             DECIMAL(20,6),                                                                                      --规格  
[SizeType]         VARCHAR(36) FOREIGN KEY REFERENCES MasterData(ID),                                                  --规格单位ID，字典  
[Color]            NVARCHAR(8),                                                                                        --颜色  
[Material]         NVARCHAR(8),                                                                                        --材质  
[StorageType]      VARCHAR(36) FOREIGN KEY REFERENCES MasterData(ID),                                                  --存储方式ID，字典  
[Description]      NVARCHAR(MAX),                                                                                      --描述  
[Enable]           BIT DEFAULT 1 NOT NULL,                                                                             --是否可用：0、不可用；1、可用  
[CreatorDeptId]    VARCHAR(36) FOREIGN KEY REFERENCES Sys_Organization(ID),                                            --创建部门ID  
[CreatorUserId]    VARCHAR(36) FOREIGN KEY REFERENCES Sys_User(ID) NOT NULL,                                           --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO  
```
## RBAC 模型
### 角色
角色表：
```sql
CREATE TABLE Sys_Role(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_Role UNIQUE CLUSTERED IDENTITY(1,1),                                       --自增序列  
[Name]             NVARCHAR(64) NOT NULL,                                                                              --名称  
[Description]      NVARCHAR(MAX),                                                                                      --描述  
[BuiltIn]          BIT DEFAULT 0 NOT NULL,                                                                             --是否预置：0、自定；1、预置  
[CreatorUserId]    VARCHAR(36) FOREIGN KEY REFERENCES Sys_User(ID) NOT NULL,                                           --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO  
```
#### 角色成员
```sql
CREATE TABLE Sys_Role_User(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_Role_User UNIQUE CLUSTERED IDENTITY(1,1),                                  --自增序列  
[RoleId]           VARCHAR(36) FOREIGN KEY REFERENCES Sys_Role(ID) ON DELETE CASCADE NOT NULL,                         --角色ID  
[UserId]           VARCHAR(36) FOREIGN KEY REFERENCES Sys_User(ID) NOT NULL,                                           --用户ID  
[CreatorUserId]    VARCHAR(36) FOREIGN KEY REFERENCES Sys_User(ID) NOT NULL,                                           --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO 
```
#### 角色权限
角色权限表：
```sql
CREATE TABLE Sys_RolePerm_Module(  
[ID]               VARCHAR(36) PRIMARY KEY NONCLUSTERED DEFAULT NEWID(),  
[SN]               BIGINT CONSTRAINT IX_Sys_RolePerm_Module UNIQUE CLUSTERED IDENTITY(1,1),                            --自增序列  
[RoleId]           VARCHAR(36) FOREIGN KEY REFERENCES Sys_Role(ID) ON DELETE CASCADE NOT NULL,                         --角色ID  
[ModuleId]         VARCHAR(36) FOREIGN KEY REFERENCES Sys_Module(ID) ON DELETE CASCADE NOT NULL,                       --模块注册ID  
[Action]           INT DEFAULT 0 NOT NULL,                                                                             --操作行为：0、拒绝访问；1、允许访问  
[Mode]             INT DEFAULT 0 NOT NULL,                                                                             --数据授权范围：-1、仅本人；0、仅本部门；1、本部门所有；2、本机构所有；3、全部；4、自定义  
[Permission]       INT DEFAULT 0 NOT NULL,                                                                             --数据权限：0、只读；1、读写  
[CreatorUserId]    VARCHAR(36) FOREIGN KEY REFERENCES Sys_User(ID) NOT NULL,                                           --创建人ID  
[CreateTime]       DATETIME DEFAULT GETDATE() NOT NULL                                                                 --创建时间  
)  
GO  
```
### 如何获取用户的权限
获取指定用户的功能权限需要先获取该用户可以访问的模块，此功能我们可以使用一个数据库表值函数来返回指定用户被授权访问的模块ID列表。在用户启动某一模块时，使用一个数据库表值函数来返回被授权功能的ID列表。
在用户访问数据时，我们需要对用户访问的数据根据授权情况进行过滤，并为这些数据加上权限标记，以便告知系统用户被许可的操作方式（只读/读写）。
我们可以在数据访问层前端进行数据的过滤和标记，这种方式的优点是：
²  安全，外部没有注入、篡改的机会。
²  高效，数据访问层获取的数据已经经过筛选，不会返回无效的数据。
²  兼容性好，和应用系统完全无关，即使应用系统通过存储过程处理数据，也能完全兼容。
简单地来说，这种机制只需要你在获取数据的时候使用inner join一个表值函数，输入函数的参数（模块ID，登录部门ID，用户ID）即可。

## 数据库函数
### 功能权限函数
#### 获取授权模块
```sql
/*****表值函数：获取当前登录用户允许访问模块*****/  
   
CREATE FUNCTION Get_PermModule(  
@UserId                VARCHAR(36),    --当前登录用户ID  
@OrgId                 VARCHAR(36)     --当前登录部门ID  
)  
   
RETURNS TABLE AS  
   
RETURN  
with Roles as(  
  select R.RoleId                              --获取当前用户作为成员的角色ID  
    from Sys_Role_User R  
    where R.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户所在用户组作为成员的角色ID  
    from Sys_Role_UserGroupR  
    join Sys_UserGroupMemberG on G.GroupId = R.GroupId  
      and G.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
      and O.ParentId = @OrgId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID（职位对应部门被合并）  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
    join Sys_OrgMerger OM on OM.MergerOrgId = O.ParentId  
      and OM.OrgId = @OrgId  
  )  
   
select M.ModuleId from Roles R  
  join Sys_RolePerm_ModuleM on M.RoleId = R.RoleId  
group by M.ModuleId  
having min(M.Action) > 0  
   
GO  
```
#### 获取授权功能
```sql
CREATE FUNCTION Get_PermAction(  
@ModuleId              VARCHAR(36),     --模块ID  
@UserId                VARCHAR(36),    --当前登录用户ID  
@OrgId                 VARCHAR(36)     --当前登录部门ID  
)  
   
RETURNS TABLE AS  
   
RETURN  
with Roles as(  
  select R.RoleId                              --获取当前用户作为成员的角色ID  
    from Sys_Role_User R  
    where R.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户所在用户组作为成员的角色ID  
    from Sys_Role_UserGroupR  
    join Sys_UserGroupMemberG on G.GroupId = R.GroupId  
      and G.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
      and O.ParentId = @OrgId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID（职位对应部门被合并）  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
    join Sys_OrgMerger OM on OM.MergerOrgId = O.ParentId  
      and OM.OrgId = @OrgId  
  )  
   
select A.ActionId from Roles R  
  join Sys_RolePerm_ActionA on A.RoleId = R.RoleId  
  join Sys_ModuleActionM on M.ID = A.ActionId  
    and M.ModuleId = @ModuleId  
group by A.ActionId  
having min(A.Action) > 0  
   
GO  

```

### 数据权限函数
#### 获取授权数据（部门模式）
```sql
CREATE FUNCTION DataPerm_Org(  
@ModuleId              VARCHAR(36),     --模块ID  
@UserId                VARCHAR(36),     --当前登录用户ID  
@OrgId                 VARCHAR(36)      --当前登录部门ID  
)  
   
RETURNS @PermScope  TABLE(  
OrgId                  VARCHAR(36),  
Permission             INT  
) AS  
   
BEGIN  
DECLARE @Mode          INT  
DECLARE @Permission    INT  
   
select @Mode = Mode, @Permission = Permission    --获取指定模块对于当前登录用户和登录部门的数据授权访问范围代码和权限代码  
from Get_PermData(@ModuleId, @UserId, @OrgId)  
   
if @Mode = 0  
  insert into @PermScope                         --授权访问范围为仅本部门时，返回本部门（当前登录部门）ID、合并到该部门的部门ID和权限代码  
    select @OrgId, @Permission  
    union  
    select MergerOrgId, @Permission  
    from Sys_OrgMerger  
    where OrgId = @OrgId  
   
else if @Mode between 1 and 3  
  begin  
  if @Mode = 2  
    select @OrgId = dbo.Get_SupOrg(@OrgId, 1)    --获取上级机构ID  
  if @Mode = 3  
    select @OrgId = dbo.Get_SupOrg(@OrgId, 0)    --获取根机构ID  
  insert into @PermScope                         --授权访问范围为本部门及下属、本机构及下属、全部时，返回本部门（当前登录部门）和相应机构/部门ID、合并到上述部门的部门ID和权限代码  
    select ID, @Permission from Get_SubOrg(@OrgId)  
  end  
   
else if @Mode = 4  
  insert into @PermScope                         --自定义授权范围和权限代码  
    select DC.OrgId, max(DC.Permission)  
    from Sys_RolePerm_DataCustomDC  
    join Sys_RolePerm_ModuleM on M.ID = DC.Perm_ModuleId  
      and M.ModuleId = @ModuleId  
    join Sys_OrganizationO on O.ID = DC.OrgId  
      and O.Validity = 1  
    group by DC.OrgId  
    union  
    select OM.MergerOrgId, max(DC.Permission)  
    from Sys_RolePerm_DataCustomDC  
    join Sys_RolePerm_ModuleM on M.ID = DC.Perm_ModuleId  
      and M.ModuleId = @ModuleId  
    join Sys_OrgMerger OM on OM.OrgId = DC.OrgId  
    group by OM.MergerOrgId  
   
insert into @PermScope                           --无归属部门的数据可被所有人访问  
  select 'All', @Permission  
   
RETURN  
END  
GO  
```

#### 获取授权数据（用户模式）
```sql
CREATE FUNCTION DataPerm_User(  
@ModuleId              VARCHAR(36),     --模块ID  
@UserId                VARCHAR(36),     --当前登录用户ID  
@OrgId                 VARCHAR(36)      --当前登录部门ID  
)  
   
RETURNS @PermScope  TABLE(  
UserId                 VARCHAR(36),  
Permission             INT  
) AS  
   
BEGIN  
DECLARE @Mode          INT  
DECLARE @Permission    INT  
   
select @Mode = Mode, @Permission = Permission    --获取指定模块对于当前登录用户和登录部门的数据授权访问范围代码和权限代码  
from Get_PermData(@ModuleId, @UserId, @OrgId)  
   
if @Mode <0  
  insert into @PermScope  
    select @UserId, @Permission                  --授权访问范围为仅本人时，返回本人ID和权限代码  
   
RETURN  
END  
GO 
```
#### 获取数据权限授权模式
```sql
CREATE FUNCTION Get_PermData(  
@ModuleId              VARCHAR(36),     --模块ID  
@UserId                VARCHAR(36),     --当前登录用户ID  
@OrgId                 VARCHAR(36)      --当前登录部门ID  
)  
   
RETURNS TABLE AS  
   
RETURN  
with Roles as(  
  select R.RoleId                              --获取当前用户作为成员的角色ID  
    from Sys_Role_User R  
    where R.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户所在用户组作为成员的角色ID  
    from Sys_Role_UserGroupR  
    join Sys_UserGroupMemberG on G.GroupId = R.GroupId  
      and G.UserId = @UserId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
      and O.ParentId = @OrgId  
  union  
  select R.RoleId                              --获取当前用户的职位作为成员的角色ID（职位对应部门被合并）  
    from Sys_Role_PositionR  
    join Sys_User_Org P on P.OrgId = R.OrgId  
      and P.UserId = @UserId  
    join Sys_OrganizationO on O.ID = R.OrgId  
    join Sys_OrgMerger OM on OM.MergerOrgId = O.ParentId  
      and OM.OrgId = @OrgId  
  )  
   
select max(M.Permission) as Permission, max(M.Mode) as Mode from Roles R  
  join Sys_RolePerm_ModuleM on M.RoleId = R.RoleId  
    and M.ModuleId = @ModuleId  
group by M.ModuleId  
   
GO  
```
## 其它函数
### 获取上级机构ID
```sql
CREATE FUNCTION Get_SupOrg(  
@DeptId                VARCHAR(36),    --部门ID  
@Type                  INT            --机构类型：0、根机构；1、上级机构  
)  
   
RETURNS NVARCHAR(36) AS  
BEGIN  
   
DECLARE @NodeType     INT = 0  
DECLARE @ParentId     VARCHAR(36)  
   
while @NodeType !=1  
  begin  
  select @NodeType = NodeType * @Type, @ParentId = ParentId from Sys_Organizationwhere ID = @DeptId  
  if @ParentId is null  
    set @NodeType = 1  
  if @NodeType != 1  
    set @DeptId = @ParentId  
  end  
   
RETURN @DeptId  
END  
GO  
```
#### 获取下属机构/部门ID
```sql
    CREATE FUNCTION Get_SubOrg(  
    @OrgId                 VARCHAR(36)      --组织机构ID  
    )  
       
    RETURNS TABLE AS  
       
    RETURN  
    with  
    OrgList as (  
      select @OrgId as ID  
      union all  
      select O.ID from Sys_OrganizationO  
      join OrgList L on L.ID = O.ParentId  
      where Validity = 1  
        and NodeType < 3),  
    MergerOrg as(  
      select OM.MergerOrgId as ID from OrgList OL  
      join Sys_OrgMerger OM on OM.OrgId = OL.ID  
      union all  
      select O.ID from Sys_OrganizationO  
      join MergerOrg M on M.ID = O.ParentId  
      where Validity = 1  
        and NodeType < 3)  
       
    select ID from OrgList  
    union  
    select ID from MergerOrg  
       
    GO 
```
