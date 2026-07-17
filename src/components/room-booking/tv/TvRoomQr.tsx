import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function TvRoomQr({ id }: { id: string }) {
  const roomUrl = `https://innohassle.ru/rooms/${id}`;
  const [qrSvg, setQrSvg] = useState("");

  useEffect(() => {
    QRCode.toString(roomUrl, {
      type: "svg",
      width: 160,
      margin: 1,
      color: {
        dark: "#111111",
        light: "#FFFFFF",
      },
    }).then((svg: string) => setQrSvg(svg));
  }, [roomUrl]);

  return (
    <div className="mt-auto flex flex-col items-center text-center">
      <p>Book this room</p>
      <div className="mt-3 flex justify-center">
        <div className="bg-base-100 inline-flex rounded-md p-2">
          <div
            className="size-40"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
      </div>
      <p className="mt-4 text-center text-[1.5rem]">
        innohassle<span className="text-primary font-semibold">.</span>ru{" "}
        <span className="text-primary font-semibold">/</span> rooms{" "}
        <span className="text-primary font-semibold">/</span> {id}
      </p>
    </div>
  );
}
