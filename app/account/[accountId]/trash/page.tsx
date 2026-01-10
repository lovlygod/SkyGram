import { TrashWrapper } from '#/lib/components/file-manager/trash-wrapper';

async function Page({
  params,
}: {
  params: {
    accountId: string;
  };
}) {
  return (
    <div className="h-full">
      <TrashWrapper />
    </div>
  );
}

export default Page;
