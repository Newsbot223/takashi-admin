'use client';

import QRCode from 'react-qr-code';

type MapsQrCodeProps = {
  url: string;
  size?: number;
};

export function MapsQrCode({ url, size = 96 }: MapsQrCodeProps) {
  return (
    <div className="inline-block rounded-md border bg-white p-2">
      <QRCode value={url} size={size} />
    </div>
  );
}
