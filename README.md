# QNexus

**QNexus** 是一个现代化、高品质的 Web UI，专为通过单一精美界面管理多个 qBittorrent 实例而设计。它兼顾性能与美学，采用令人惊叹的毛玻璃（Glassmorphism）设计风格和轻量级架构。

![QNexus UI](https://via.placeholder.com/800x450?text=QNexus+UI+Preview)

## ✨ 特性

*   **多实例管理**：无缝切换并控制多个 qBittorrent 服务器。
*   **高品质 UI**：现代化的设计，支持深色模式和流畅动画。
*   **实时监控**：实时速度图表和状态更新。
*   **轻量级**：Docker 镜像大小**不到 200MB**（基于 Alpine Linux）。
*   **移动端适配**：针对移动设备进行了全面优化。
*   **国际化**：支持多语言（英语、中文）。

## 🚀 快速开始

### Docker Compose (推荐)

1.  克隆仓库（或下载文件）。
2.  运行以下命令：

```bash
docker-compose up -d
```

3.  打开浏览器并访问 `http://localhost:3000`。

### 配置

本应用使用 SQLite 数据库存储设置和容器配置。

*   **数据库位置**：默认情况下，数据存储在容器内的 `/config` 目录中。
*   **卷映射**：将本地目录映射到 `/config` 以持久化保存数据。

```yaml
volumes:
  - ./data:/config
```

## 🛠️ 开发

### 前置要求

*   Node.js 18+
*   NPM 或 Yarn

### 设置

1.  **后端**：
    ```bash
    cd backend
    npm install
    npm run dev
    ```

2.  **前端**：
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 📄 许可证

MIT License
