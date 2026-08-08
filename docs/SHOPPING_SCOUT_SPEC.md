# 買い物スカウター（統合仕様）

この文書は本リポジトリの開発における唯一の仕様正本（Single Source of Truth）とする。  
実装上の判断はこの文書を優先する。

## 0. 目標
アプリ本体完成前提のセットアップフェーズでは、次の対象に集中する。  
- 仕様保存  
- 開発ルール整理  
- PWA最小基盤  
- 商品解析ロジックの土台  
- fixture / test  
- 次工程への引き継ぎ  

以下の実装項目は当フェーズで行わない。  
- Tesseract.jsに依存したOCR本実装  
- カメラ本実装  
- 画像切り抜きUI  
- 画像前処理  
- IndexedDB本実装  
- 価格履歴UI  
- グラフ表示  
- ChatGPT共有機能  
- バーコード実装  
- 完成版UI  
- 有料API / 外部価格検索 / 規約違反スクレイピング  

## 1. 運用優先条件
- Android Chrome を優先対象  
- PWA として動作可能な最小構成  
- ローカルファースト設計  
- Phase 1 は完全無料  
- 画像を原則外部送信しない  
- OCR結果はユーザーが確認しない限り確定しない  
- 価格評価と品質評価を混同しない  
- 自分の価格履歴を「市場価格」と誤って呼ばない  
- 異なる容量を価格だけで比較しない  
- 健康食品等の効能はアプリ側で断定しない  
- 既存テストを削除して通す行為は禁止  

## 2. 12件のテキストfixture（OCR結果の文字列）
本格OCRではなく、OCRから得られる文字列を前提とする。

### CASE 01 ANKER
```
79054
ANKER
充電器＆ケーブルセット
B2698H21
最大70W
USB-C & USB-C 1.8M
4,980
```

期待:  
`currentPrice = 4980`  
`cableLength = 1.8m`  
`79054 / B2698H21 / 70` を価格として誤認しない  

### CASE 02 KIRKLAND
```
KIRKLAND SIGNATURE
トイレットペーパー
42.9m
30ロール
2枚重ね
2,398
```

期待:  
`30ロール`  
`42.9m/roll`  
`totalLength = 1287m`  
`pricePerRoll ≒ 79.93`  
`pricePerMeter ≒ 1.86`  
`2PLY`  

### CASE 03 COREUSE
```
170m
6ロール × 4パック
1PLY
1,998
```

期待:  
`24ロール`  
`totalLength = 4080m`  
`pricePerRoll ≒ 83.25`  
`pricePerMeter ≒ 0.49`  
`1PLY`  

### CASE 04 LISTERINE
```
リステリン
トータルケアPLUS
1L × 4本
通常価格 2,998
レジにて割引 -600
2,398
```

期待:  
`currentPrice = 2398`  
`regularPrice = 2998`  
`discountAmount = 600`  
`totalVolume = 4L`  
`pricePerLiter = 599.5`  
`discountRate ≒ 20.0%`  

### CASE 05 NONIO
```
NONIOプラス ホワイトニング
1000mL × 3本
1,998
```

期待:  
`3本`  
`totalVolume = 3L`  
`pricePerLiter = 666`  

### CASE 06 NMN
```
NMN
100mg × 120粒
1日目安2粒
60日分
3,198
```

期待:  
`120粒`  
`2粒/day`  
`60days`  
`pricePerDay ≒ 53.3`  
`100mg`を価格として誤認しない  

### CASE 07 COLLAGEN
```
コラリッチ
コラーゲンショット
50mL × 20本
2,880
```

期待:  
`20本`  
`totalVolume = 1000mL`  
`pricePerItem = 144`  
`pricePerLiter = 2880`  

### CASE 08 EQUOL
```
エクオール10mg
180粒
1日4粒
45日分
3,948
```

期待:  
`180粒`  
`4粒/day`  
`45days`  
`pricePerDay ≒ 87.73`  

### CASE 09 SOAP
```
ボタニカルソープ
200g × 8個
2,198
```

期待:  
`8個`  
`totalWeight = 1600g`  
`pricePerItem = 274.75`  
`pricePer100g ≒ 137.38`  

### CASE 10 NAKAMURAYA
```
574036
新宿中村屋
ビーフカリー
200g × 10袋
1,898
```

期待:  
`10食`  
`totalWeight = 2000g`  
`pricePerServing = 189.8`  
`pricePer100g = 94.9`  
`574036` を価格として誤認しない  

### CASE 11 SHIJIMI
```
神州一味噌
殻付きしじみ汁
16食
通常価格899
レジにて割引 -200
699
```

期待:  
`16食`  
`pricePerServing ≒ 43.6875`  
`regularPrice = 899`  
`discountAmount = 200`  
`currentPrice = 699`  

### CASE 12 AMARA
```
AMARA
本場のバターチキン 2P
ハニーバターチキン 2P
各170g
1,498
```

期待:  
`4食`  
`totalWeight = 680g`  
`pricePerServing = 374.5`  
`pricePer100g ≒ 220.29`  
`10食 / 1食150円` などを誤認しない  
