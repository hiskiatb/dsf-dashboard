import * as htmlToImage from "html-to-image";
import { Copy } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function CopyImageButton({ targetRef }) {

  async function copyImage() {
    if (!targetRef?.current) return;

    try {

      const dataUrl = await htmlToImage.toPng(targetRef.current, {
        pixelRatio: 4,
        backgroundColor: "#ffffff",
      });

      const blob = await (await fetch(dataUrl)).blob();

      // TRY COPY CLIPBOARD (desktop)
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      toast.success("Report copied as image", {
        icon: "📋",
      });

    } catch (err) {

      console.warn("Clipboard not supported, fallback download");

      try {

        const dataUrl = await htmlToImage.toPng(targetRef.current, {
          pixelRatio: 4,
          backgroundColor: "#ffffff",
        });

        const link = document.createElement("a");
        link.download = "report.png";
        link.href = dataUrl;
        link.click();

        toast.success("Image downloaded (mobile mode)", {
          icon: "⬇️",
        });

      } catch (e) {

        toast.error("Failed to export image");

      }

    }
  }

  return (
    <motion.button
      onClick={copyImage}
      className="
        flex items-center gap-2
        px-3 py-2
        text-sm font-medium
        border border-gray-200
        bg-white
        text-gray-700
        rounded-lg
        shadow-sm
        hover:bg-gray-50
        transition
      "
      whileTap={{ scale: 0.95 }}
    >
      <Copy size={16} />
      Copy as Image
    </motion.button>
  );
}