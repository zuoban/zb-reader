# 📚 ZB Reader API 文档

## 基础信息

- **基础 URL**: `http://localhost:3000/api`
- **认证方式**: Session-based (NextAuth v5)
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

## 认证

大多数 API 端点需要认证。未认证的请求将返回 `401 Unauthorized`。

### 认证方式

使用 NextAuth v5 进行会话认证。客户端需要包含有效的会话 cookie。

---

## 📚 书籍管理

### 获取书籍列表

获取当前用户的所有书籍。

```http
GET /api/books
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| search | string | 否 | - | 搜索关键词（书名或作者） |
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| withProgress | boolean | 否 | false | 是否包含阅读进度 |

**响应示例**

```json
{
  "books": [
    {
      "id": "uuid",
      "title": "示例书籍",
      "author": "作者名",
      "cover": "cover.jpg",
      "filePath": "book.epub",
      "fileSize": 2097152,
      "format": "epub",
      "description": "书籍简介",
      "createdAt": "2024-01-01 00:00:00",
      "updatedAt": "2024-01-01 00:00:00"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**包含进度的响应**

```json
{
  "books": [...],
  "progressMap": {
    "book-id-1": 0.75,
    "book-id-2": 0.5
  },
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**状态码**

- `200` - 成功
- `401` - 未认证
- `500` - 服务器错误

---

### 上传书籍

上传新的电子书。

```http
POST /api/books
```

**请求体**

`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 电子书文件（EPUB） |
| title | string | 否 | 自定义标题（覆盖元数据） |
| author | string | 否 | 自定义作者（覆盖元数据） |

**响应示例**

```json
{
  "book": {
    "id": "uuid",
    "title": "书籍标题",
    "author": "作者名",
    "cover": "cover.jpg",
    "filePath": "book.epub",
    "fileSize": 2097152,
    "format": "epub",
    "description": null,
    "uploaderId": "user-uuid",
    "createdAt": "2024-01-01 00:00:00",
    "updatedAt": "2024-01-01 00:00:00"
  }
}
```

**状态码**

- `201` - 创建成功
- `400` - 无效请求（无文件、不支持的格式）
- `401` - 未认证
- `500` - 服务器错误

**支持的格式**

- EPUB (`.epub`)

---

### 获取书籍详情

获取单本书籍的详细信息。

```http
GET /api/books/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 书籍 ID |

**响应示例**

```json
{
  "book": {
    "id": "uuid",
    "title": "书籍标题",
    "author": "作者名",
    "cover": "cover.jpg",
    "filePath": "book.epub",
    "fileSize": 2097152,
    "format": "epub",
    "description": "书籍简介",
    "isbn": "978-0-000-00000-0",
    "publisher": "出版社",
    "publishDate": "2024-01-01",
    "language": "zh",
    "uploaderId": "user-uuid",
    "createdAt": "2024-01-01 00:00:00",
    "updatedAt": "2024-01-01 00:00:00"
  }
}
```

**状态码**

- `200` - 成功
- `401` - 未认证
- `404` - 书籍不存在
- `500` - 服务器错误

---

### 删除书籍

删除一本书籍及其关联数据。

```http
DELETE /api/books/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 书籍 ID |

**响应示例**

```json
{
  "message": "删除成功"
}
```

**状态码**

- `200` - 删除成功
- `401` - 未认证
- `404` - 书籍不存在
- `500` - 服务器错误

**注意**

删除书籍会同时删除：
- 书籍文件
- 封面图片
- 阅读进度
- 书签
- 笔记

---

### 获取书籍封面

获取书籍封面图片。

```http
GET /api/books/:id/cover
```

**响应**

返回图片二进制数据（JPEG 格式）

**状态码**

- `200` - 成功（返回图片）
- `401` - 未认证
- `404` - 书籍或封面不存在

---

### 获取书籍文件

获取书籍文件内容。

```http
GET /api/books/:id/file
```

**响应**

返回文件二进制数据

**状态码**

- `200` - 成功（返回文件）
- `401` - 未认证
- `404` - 书籍不存在

---

## 📖 阅读进度

### 获取阅读进度

获取指定书籍的阅读进度。

```http
GET /api/progress?bookId=:bookId
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookId | string | 是 | 书籍 ID |

**响应示例**

```json
{
  "progress": {
    "id": "uuid",
    "userId": "user-uuid",
    "bookId": "book-uuid",
    "progress": 0.75,
    "location": "chapter-5",
    "currentPage": 150,
    "totalPages": 200,
    "lastReadAt": "2024-01-01 12:00:00",
    "createdAt": "2024-01-01 00:00:00",
    "updatedAt": "2024-01-01 12:00:00"
  }
}
```

**无进度时**

```json
{
  "progress": null
}
```

**状态码**

- `200` - 成功
- `400` - 缺少 bookId 参数
- `401` - 未认证
- `500` - 服务器错误

---

### 更新阅读进度

创建或更新阅读进度。

```http
PUT /api/progress
```

**请求体**

```json
{
  "bookId": "book-uuid",
  "progress": 0.75,
  "location": "chapter-5",
  "currentPage": 150,
  "totalPages": 200
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookId | string | 是 | 书籍 ID |
| progress | number | 否 | 进度百分比（0-1） |
| location | string | 否 | 位置标识（EPUB: CFI） |
| currentPage | number | 否 | 当前页码 |
| totalPages | number | 否 | 总页数 |

**响应示例**

```json
{
  "progress": {
    "userId": "user-uuid",
    "bookId": "book-uuid",
    "progress": 0.75,
    "location": "chapter-5",
    "currentPage": 150,
    "totalPages": 200,
    "lastReadAt": "2024-01-01 12:00:00"
  }
}
```

**状态码**

- `200` - 更新成功
- `400` - 缺少 bookId 参数
- `401` - 未认证
- `500` - 服务器错误

---

## 🔖 书签管理

### 获取书签列表

获取指定书籍的所有书签。

```http
GET /api/bookmarks?bookId=:bookId
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookId | string | 是 | 书籍 ID |

**响应示例**

```json
{
  "bookmarks": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "bookId": "book-uuid",
      "location": "chapter-3",
      "label": "重要章节",
      "pageNumber": 100,
      "progress": 0.5,
      "createdAt": "2024-01-01 12:00:00",
      "updatedAt": "2024-01-01 12:00:00"
    }
  ]
}
```

**状态码**

- `200` - 成功
- `400` - 缺少 bookId 参数
- `401` - 未认证
- `500` - 服务器错误

---

### 创建书签

创建新书签。

```http
POST /api/bookmarks
```

**请求体**

```json
{
  "bookId": "book-uuid",
  "location": "chapter-3",
  "label": "重要章节",
  "pageNumber": 100,
  "progress": 0.5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookId | string | 是 | 书籍 ID |
| location | string | 是 | 位置标识 |
| label | string | 否 | 书签标签（默认：时间戳） |
| pageNumber | number | 否 | 页码 |
| progress | number | 否 | 进度 |

**响应示例**

```json
{
  "bookmark": {
    "id": "uuid",
    "userId": "user-uuid",
    "bookId": "book-uuid",
    "location": "chapter-3",
    "label": "重要章节",
    "pageNumber": 100,
    "progress": 0.5,
    "createdAt": "2024-01-01 12:00:00",
    "updatedAt": "2024-01-01 12:00:00"
  }
}
```

**状态码**

- `201` - 创建成功
- `400` - 缺少必要参数
- `401` - 未认证
- `500` - 服务器错误

---

### 删除书签

删除指定书签。

```http
DELETE /api/bookmarks/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 书签 ID |

**响应示例**

```json
{
  "message": "删除成功"
}
```

**状态码**

- `200` - 删除成功
- `401` - 未认证
- `404` - 书签不存在
- `500` - 服务器错误

---

## 📝 笔记管理

### 获取笔记列表

获取指定书籍的所有笔记。

```http
GET /api/notes?bookId=:bookId
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bookId | string | 是 | 书籍 ID |

**响应示例**

```json
{
  "notes": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "bookId": "book-uuid",
      "location": "chapter-3",
      "selectedText": "这是选中的文本",
      "content": "这是我的笔记",
      "color": "yellow",
      "pageNumber": 100,
      "progress": 0.5,
      "createdAt": "2024-01-01 12:00:00",
      "updatedAt": "2024-01-01 12:00:00"
    }
  ]
}
```

**状态码**

- `200` - 成功
- `400` - 缺少 bookId 参数
- `401` - 未认证
- `500` - 服务器错误

---

### 创建笔记

创建新笔记。

```http
POST /api/notes
```

**请求体**

```json
{
  "bookId": "book-uuid",
  "location": "chapter-3",
  "selectedText": "这是选中的文本",
  "content": "这是我的笔记",
  "color": "yellow",
  "pageNumber": 100,
  "progress": 0.5
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| bookId | string | 是 | - | 书籍 ID |
| location | string | 是 | - | 位置标识 |
| selectedText | string | 否 | - | 选中的文本 |
| content | string | 否 | - | 笔记内容 |
| color | string | 否 | "yellow" | 高亮颜色 |
| pageNumber | number | 否 | - | 页码 |
| progress | number | 否 | - | 进度 |

**颜色选项**

- `yellow` - 黄色
- `green` - 绿色
- `blue` - 蓝色
- `pink` - 粉色
- `purple` - 紫色

**响应示例**

```json
{
  "note": {
    "id": "uuid",
    "userId": "user-uuid",
    "bookId": "book-uuid",
    "location": "chapter-3",
    "selectedText": "这是选中的文本",
    "content": "这是我的笔记",
    "color": "yellow",
    "pageNumber": 100,
    "progress": 0.5,
    "createdAt": "2024-01-01 12:00:00",
    "updatedAt": "2024-01-01 12:00:00"
  }
}
```

**状态码**

- `201` - 创建成功
- `400` - 缺少必要参数
- `401` - 未认证
- `500` - 服务器错误

---

### 更新笔记

更新指定笔记。

```http
PUT /api/notes/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 笔记 ID |

**请求体**

```json
{
  "content": "更新后的笔记内容",
  "color": "blue"
}
```

**响应示例**

```json
{
  "note": {
    "id": "uuid",
    "content": "更新后的笔记内容",
    "color": "blue"
  }
}
```

**状态码**

- `200` - 更新成功
- `401` - 未认证
- `404` - 笔记不存在
- `500` - 服务器错误

---

### 删除笔记

删除指定笔记。

```http
DELETE /api/notes/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 笔记 ID |

**响应示例**

```json
{
  "message": "删除成功"
}
```

**状态码**

- `200` - 删除成功
- `401` - 未认证
- `404` - 笔记不存在
- `500` - 服务器错误

---

## 👤 用户管理

### 获取用户信息

获取当前登录用户的信息。

```http
GET /api/user
```

**响应示例**

```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "avatar": "/api/user/avatar/uuid",
    "createdAt": "2024-01-01 00:00:00"
  }
}
```

**状态码**

- `200` - 成功
- `401` - 未认证
- `404` - 用户不存在
- `500` - 服务器错误

---

### 更新用户信息

更新当前用户的信息。

```http
PATCH /api/user
```

**请求体**

```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "avatar": "avatar-filename.jpg"
}
```

| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| username | string | 否 | 长度 2-20 字符，唯一 |
| email | string | 否 | 有效邮箱格式，唯一 |
| password | string | 否 | 最少 6 个字符 |
| avatar | string | 否 | 头像文件名 |

**响应示例**

```json
{
  "message": "更新成功",
  "user": {
    "id": "uuid",
    "username": "newusername",
    "email": "newemail@example.com",
    "avatar": "/api/user/avatar/uuid"
  }
}
```

**状态码**

- `200` - 更新成功
- `400` - 验证失败
- `401` - 未认证
- `404` - 用户不存在
- `409` - 用户名或邮箱已被使用
- `500` - 服务器错误

---

### 上传头像

上传用户头像。

```http
POST /api/user/avatar
```

**请求体**

`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件（JPEG/PNG） |

**响应示例**

```json
{
  "avatar": "/api/user/avatar/uuid"
}
```

**状态码**

- `200` - 上传成功
- `401` - 未认证
- `500` - 服务器错误

---

### 获取用户头像

获取用户头像图片。

```http
GET /api/user/avatar/:userId
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |

**响应**

返回图片二进制数据（JPEG 格式）

**状态码**

- `200` - 成功（返回图片）
- `404` - 头像不存在

---

## ⚙️ 阅读设置

### 获取阅读设置

获取当前用户的阅读设置。

```http
GET /api/reader-settings
```

**响应示例**

```json
{
  "settings": {
    "id": "uuid",
    "userId": "user-uuid",
    "fontSize": 16,
    "theme": "light",
    "ttsEngine": "browser",
    "browserVoiceId": "zh-CN",
    "ttsRate": 1,
    "ttsPitch": 1,
    "ttsVolume": 1,
    "microsoftPreloadCount": 3,
    "legadoRate": 50,
    "legadoConfigId": null,
    "legadoPreloadCount": 3,
    "ttsAutoNextChapter": false,
    "createdAt": "2024-01-01 00:00:00",
    "updatedAt": "2024-01-01 00:00:00"
  }
}
```

**状态码**

- `200` - 成功
- `401` - 未认证
- `500` - 服务器错误

---

### 更新阅读设置

更新当前用户的阅读设置。

```http
PUT /api/reader-settings
```

**请求体**

```json
{
  "fontSize": 18,
  "theme": "dark",
  "ttsEngine": "browser",
  "ttsRate": 1.2,
  "ttsAutoNextChapter": true
}
```

**响应示例**

```json
{
  "settings": {
    "fontSize": 18,
    "theme": "dark",
    "ttsEngine": "browser",
    "ttsRate": 1.2,
    "ttsAutoNextChapter": true
  }
}
```

**状态码**

- `200` - 更新成功
- `401` - 未认证
- `500` - 服务器错误

---

## 🔊 TTS (文本转语音)

### 获取 TTS 配置列表

获取所有自定义 TTS 配置。

```http
GET /api/tts
```

**响应示例**

```json
{
  "configs": [
    {
      "id": "uuid",
      "name": "Legado TTS",
      "url": "http://example.com/tts",
      "method": "GET",
      "createdAt": "2024-01-01 00:00:00",
      "updatedAt": "2024-01-01 00:00:00"
    }
  ]
}
```

**状态码**

- `200` - 成功
- `401` - 未认证
- `500` - 服务器错误

---

### 获取微软 TTS 语音列表

获取可用的微软 TTS 语音。

```http
GET /api/tts/microsoft/voices
```

**响应示例**

```json
{
  "voices": [
    {
      "ShortName": "zh-CN-XiaoxiaoNeural",
      "Gender": "Female",
      "Locale": "zh-CN"
    }
  ]
}
```

**状态码**

- `200` - 成功
- `500` - 服务器错误

---

## 🔐 认证

### 用户注册

注册新用户。

```http
POST /api/auth/register
```

**请求体**

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| username | string | 是 | 长度 2-20 字符，唯一 |
| email | string | 是 | 有效邮箱格式，唯一 |
| password | string | 是 | 最少 6 个字符 |

**响应示例**

```json
{
  "message": "注册成功",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**状态码**

- `201` - 注册成功
- `400` - 验证失败
- `409` - 用户名或邮箱已存在
- `500` - 服务器错误

---

## ❌ 错误响应

所有错误响应遵循统一格式：

```json
{
  "error": "错误描述信息"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如唯一性检查失败） |
| 500 | 服务器内部错误 |

---

## 📝 示例代码

### JavaScript/TypeScript

```typescript
// 获取书籍列表
const response = await fetch('/api/books?withProgress=true');
const data = await response.json();
console.log(data.books);

// 上传书籍
const formData = new FormData();
formData.append('file', file);
const uploadResponse = await fetch('/api/books', {
  method: 'POST',
  body: formData
});
const newBook = await uploadResponse.json();

// 更新阅读进度
await fetch('/api/progress', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookId: 'book-uuid',
    progress: 0.75,
    location: 'chapter-5'
  })
});
```

---

## 📌 注意事项

1. **认证**: 大多数端点需要用户认证
2. **权限**: 用户只能访问和操作自己的数据
3. **文件大小**: 上传文件大小限制取决于服务器配置
4. **并发**: 阅读进度更新使用 upsert 操作，避免并发问题
5. **时区**: 所有时间使用服务器本地时区（UTC+8）

---

## 🔄 版本历史

- **v1.0.0** - 初始版本
  - 基础书籍管理
  - 阅读进度
  - 书签和笔记
  - 用户认证
  - TTS 支持

---

如有问题或建议，请创建 [Issue](https://github.com/yourusername/zb-reader/issues)。
