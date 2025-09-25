type Props = {
  children: React.ReactNode;
};

export function SkeletonPageLayout(props: Props) {
  const { children } = props;
  return <main className="grid flex-1 gap-4 overflow-auto p-4">{children}</main>;
}
