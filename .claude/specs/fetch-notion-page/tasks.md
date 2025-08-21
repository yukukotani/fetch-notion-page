# 実装計画

## 基盤セットアップ

- [ ] 1. プロジェクトの初期セットアップとディレクトリ構造の作成
  - package.jsonの設定（name: fetch-notion-page）
  - TypeScript設定（tsconfig.json）
  - Biome設定（biome.json）
  - 必要なディレクトリ作成（src/presentation, src/usecase, src/libs）
  - _要件: 5.1_

- [ ] 2. 依存関係のインストール
  - @notionhq/client
  - @praha/byethrow
  - gunshi（CLI用）
  - dotenv（環境変数読み込み用）
  - vitestとpower-assert-monorepo（テスト用）
  - _要件: 5.1_

## 型定義とデータモデル

- [ ] 3. 基本的な型定義の作成
  - [ ] 3.1 BlockWithChildren型の定義
    - Notion APIのBlockObjectResponseを拡張
    - children?プロパティを追加
    - _要件: 5.3_
  
  - [ ] 3.2 エラー型の定義
    - FetchNotionPageError型の定義（各種エラーケース）
    - NotionApiError型の定義
    - BuildError型の定義
    - _要件: 5.4_

## コアロジックの実装（TDD）

- [ ] 4. NotionBlockFetcherクラスの実装
  - [ ] 4.1 NotionBlockFetcherのテスト作成
    - 成功ケースのテスト
    - ページネーション処理のテスト
    - 各種エラーケースのテスト（404、401、ネットワークエラー）
    - _要件: 1.1, 4.2, 4.3_
  
  - [ ] 4.2 NotionBlockFetcherの実装
    - Notion SDKクライアントの初期化
    - fetchBlocksメソッドの実装（ページネーション対応）
    - Result型でのエラーハンドリング
    - _要件: 1.1, 4.2_

- [ ] 5. 再帰的ブロック構築関数の実装
  - [ ] 5.1 buildBlockHierarchyのテスト作成
    - ネストなしブロックのテスト
    - 1階層ネストのテスト
    - 多階層ネストのテスト
    - 深度制限のテスト
    - 循環参照防止のテスト
    - _要件: 1.2, 1.3, 4.4_
  
  - [ ] 5.2 buildBlockHierarchyの実装
    - 再帰的な子ブロック取得ロジック
    - Promise.allによる並列処理
    - 深度制限チェック
    - _要件: 1.2, 1.3, 4.1, 4.4_

## Usecase層の実装

- [ ] 6. fetchNotionPage関数の実装
  - [ ] 6.1 fetchNotionPageのテスト作成
    - 正常系の統合テスト
    - APIキー未設定エラーのテスト
    - ページ不存在エラーのテスト
    - オプションパラメータのテスト
    - _要件: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 6.2 fetchNotionPageの実装
    - オプションのデフォルト値設定
    - NotionBlockFetcherとbuildBlockHierarchyの連携
    - エラーの適切な変換と返却
    - _要件: 2.1, 2.2, 2.3, 2.4_

## CLIの実装

- [ ] 7. CLIハンドラーの実装
  - [ ] 7.1 CLIのテスト作成
    - コマンドライン引数パースのテスト
    - 環境変数読み込みのテスト
    - JSON出力のテスト
    - エラー出力のテスト
    - _要件: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 7.2 CLIの実装
    - gunshiを使った引数定義と実行
    - 環境変数からのAPIキー取得
    - fetchNotionPage関数の呼び出し
    - 結果のJSON出力
    - エラーハンドリングと適切な終了コード
    - _要件: 3.1, 3.2, 3.3, 3.4_

## パッケージング

- [ ] 8. ライブラリとCLIのエクスポート設定
  - [ ] 8.1 package.jsonのexports設定
    - メインエントリポイント（fetchNotionPage関数）
    - 型定義のエクスポート
    - _要件: 2.1_
  
  - [ ] 8.2 CLIコマンドの設定
    - package.jsonのbinフィールド設定
    - シェバン行の追加
    - _要件: 3.1_

## ビルドとリント

- [ ] 9. ビルドとリントの設定と実行
  - [ ] 9.1 TypeScriptビルド設定
    - tsconfigのビルド設定
    - distディレクトリへの出力
    - _要件: 5.1_
  
  - [ ] 9.2 リントとフォーマット
    - Biomeによるコードチェック
    - 全ファイルのフォーマット実行
    - _要件: 5.1_

## 統合テストと仕上げ

- [ ] 10. 統合テストの実装と実行
  - [ ] 10.1 E2Eテストの作成（モック使用）
    - 完全なページ取得フローのテスト
    - 様々なブロックタイプの検証
    - _要件: 1.1, 1.2, 1.3_
  
  - [ ] 10.2 CLIの動作確認
    - npx経由での実行テスト
    - 各種オプションの動作確認
    - _要件: 3.1, 3.2, 3.3, 3.4_

- [ ] 11. ドキュメントの整備
  - README.mdの作成（使用方法、API仕様）
  - 型定義のJSDocコメント追加
  - _要件: 5.1, 5.2_