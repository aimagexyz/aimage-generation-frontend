export default function NotFoundPage() {
  return (
    <div className="h-screen flex justify-center items-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl mt-4">ページが見つかりません</p>
        <p className="mt-2">お探しのページは存在しないか、移動された可能性があります。</p>
      </div>
    </div>
  );
}
