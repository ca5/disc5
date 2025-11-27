# Discography Site Generator

このプロジェクトは、アーティストがGoogleスプレッドシートでデータを管理し、GitHub Pagesでホスティングできるディスコグラフィーページ生成ツールです。

## セットアップ

1.  **このリポジトリをフォークします。**
2.  **GitHub Pagesを有効化します**: リポジトリ設定の「Pages」で、Sourceを「GitHub Actions」に設定してください。
3.  **Googleスプレッドシートの準備**:
    *   `discography` というタブを持つスプレッドシートを作成します。
    *   **discography** タブの列: `year`, `title`, `type`, `description`, `url`, `imageUrl` (Google Driveのリンク)。
    *   **公開設定**: 以下のいずれかの方法で公開してください。
        *   **方法A（推奨）: ウェブに公開**
            *   ファイル > 共有 > ウェブに公開 > ドキュメント全体 > CSV形式 で公開します。
            *   発行されたURL（`https://docs.google.com/...`）をコピーしておきます。
        *   **方法B: リンク共有**
            *   共有ボタン > 一般的なアクセス > 「リンクを知っている全員」に変更します。
            *   ブラウザのURLバーにあるID（`/d/`と`/edit`の間にある文字列）をコピーしておきます。
4.  **環境変数の設定**: GitHubリポジトリの Settings > Secrets and variables > Actions > Variables に以下を設定します:
    *   `NEXT_PUBLIC_SPREADSHEET_ID`:
        *   **方法Aの場合**: 「ウェブに公開」で発行されたURL全体、またはその中の長いID（`2PACX...`）を設定します。
        *   **方法Bの場合**: スプレッドシートのID（`1Kg...` など）を設定します。
    *   `NEXT_PUBLIC_DISCOGRAPHY_GID`: `discography` タブのGID。
5.  **Google Drive画像の利用 (任意)**:
    *   Google Drive上の画像をビルド時にダウンロードして使用したい場合は、サービスアカウントが必要です。
    *   Google Cloud Consoleでサービスアカウントを作成し、Google Drive APIを有効化します。
    *   JSONキーをダウンロードします。
    *   `GOOGLE_APPLICATION_CREDENTIALS_JSON` という名前で **Repository Secret** にJSONキーの中身を登録します。
    *   使用したい画像があるGoogle Driveのフォルダ（またはファイル）を、サービスアカウントのメールアドレスに共有します。

## 開発（ローカル実行）

```bash
cd disc5
npm install
npm run dev
```

## 動作確認手順

### 1. ローカルでの確認（推奨）

1.  `.env.example` をコピーして `.env.local` を作成します。
    ```bash
    cp .env.example .env.local
    ```
2.  `.env.local` を開き、スプレッドシートのIDなどを入力します（まだ準備できていない場合はそのままでも動きますが、データは空になります）。
3.  開発サーバーを起動します。
    ```bash
    npm run dev
    ```
4.  ブラウザで `http://localhost:3000` にアクセスします。

### 2. 本番環境での確認

1.  コードをコミットしてプッシュします。
2.  GitHubのリポジトリページで「Actions」タブを開き、ビルドが成功しているか確認します。
3.  成功していれば、GitHub PagesのURL（Settings > Pagesで確認可能）にアクセスします。
    *   ※ 環境変数の設定（`NEXT_PUBLIC_SPREADSHEET_ID` など）をGitHubのSettingsで行う必要があります。
