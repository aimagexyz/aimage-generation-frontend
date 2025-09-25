import { motion } from 'framer-motion';

export function PageHeader() {
  return (
    <motion.div
      className="px-6 py-6 border-b bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            レビューポイントとは？
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            レビューポイントは、監修業務で担当者が着目すべきポイントを整理したものです。
            レビューセットを作成することで、レビュー基準を効率的に管理・整理することができます。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
