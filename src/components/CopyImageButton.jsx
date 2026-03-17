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

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      toast.success("Report copied as image", {
        icon: "📋",
        duration: 2500,
        style: {
          borderRadius: "10px",
          background: "#111827",
          color: "#fff",
          fontSize: "14px",
          padding: "10px 14px",
        },
      });

    } catch (err) {
      console.error(err);

      toast.error("Failed to copy image", {
        duration: 2500,
        style: {
          borderRadius: "10px",
          background: "#7f1d1d",
          color: "#fff",
        },
      });
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
        hover:shadow
        transition
      "
      whileTap={{ scale: 0.95 }}
    >
      <Copy size={16} />
      Copy as Image
    </motion.button>
  );
}