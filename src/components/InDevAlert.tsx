import { LuConstruction } from 'react-icons/lu';

import { Alert, AlertDescription, AlertTitle } from './ui/Alert';

type Props = {
  title: string;
  className?: string;
};

export function InDevAlert(props: Props) {
  const { title, className } = props;
  return (
    <Alert className={className}>
      <LuConstruction size={16} className="size-4 text-yellow-500" />
      <AlertTitle>
        この先 <span className="text-red-600 font-bold">工事中</span>
      </AlertTitle>
      <AlertDescription>「{title}」は開発中のため、まだご利用いただけません。ご協力ください。</AlertDescription>
    </Alert>
  );
}
