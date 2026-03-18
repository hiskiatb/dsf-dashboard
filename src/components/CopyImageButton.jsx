import * as htmlToImage from "html-to-image";
import { Copy } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

function getActiveFilters(filters) {
  if (!filters) return null;

  const active = [];
  Object.entries(filters).forEach(([key, val]) => {
    if (val && val.length > 0) {
      active.push(`${key}: ${val.join(", ")}`);
    }
  });
  if (active.length === 0) return null;
  return active.join(" | ");
}

function getTimestamp() {
  const now = new Date();
  const date =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  const time =
    String(now.getHours()).padStart(2, "0") +
    "-" +
    String(now.getMinutes()).padStart(2, "0");
  return `${date}_${time}`;
}

export default function CopyImageButton({
  targetRef,
  dataDates = {},
  filters = null,
  rankType = null,
  sortBy = null,
  reportType = null,
  reportName = null
}) {

  async function exportImage() {
    if (!targetRef?.current) {
      toast.error("Table not ready");
      return;
    }

    const element = targetRef.current;

    const im3Date = dataDates?.DATA_FWA_IM3 || "N/A";
    const threeDate = dataDates?.DATA_FWA_3ID || "N/A";
    const activeFilters = getActiveFilters(filters);

    // Mapping sortBy key ke label yang rapi
const sortMap = {
  achievement: "Achievement",
  revenue: "Revenue",
  fwa: "FWA",
  rebuy: "Rebuy",
};
const sortLabel = sortBy ? sortMap[sortBy] || sortBy : null;


    // Subtitle lengkap
    const subtitleLines = [];
    if (rankType) subtitleLines.push(`Leaderboard: ${rankType}`);
if (sortLabel) subtitleLines.push(`Sort By: ${sortLabel}`);
    if (activeFilters) subtitleLines.push(`Filters: ${activeFilters}`);
    subtitleLines.push(`Data IM3: ${im3Date} | Data 3ID: ${threeDate}`);

    // Wrapper utama
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "0";
    wrapper.style.top = "0";
    wrapper.style.background = "#ffffff";
    wrapper.style.padding = "32px";
    wrapper.style.fontFamily = "Inter, sans-serif";
    wrapper.style.color = "#111827";
    wrapper.style.width = "max-content";
    wrapper.style.overflow = "visible";

    // Header
    const header = document.createElement("div");
    header.style.marginBottom = "20px";

    const title = document.createElement("div");
    title.innerText = "DSF Achievement Tracker";
    title.style.fontSize = "22px";
    title.style.fontWeight = "700";

    const subtitle = document.createElement("div");
    subtitle.innerText = subtitleLines.join("\n");
    subtitle.style.whiteSpace = "pre-line";
    subtitle.style.fontSize = "12px";
    subtitle.style.color = "#6b7280";
    subtitle.style.marginTop = "6px";
    subtitle.style.lineHeight = "1.5";

    header.appendChild(title);
    header.appendChild(subtitle);

    // Clone tabel
    const clone = element.cloneNode(true);
    clone.style.width = "max-content";
    clone.style.minWidth = "100%";
    clone.style.overflow = "visible";
    clone.style.display = "inline-block";

    wrapper.appendChild(header);
    wrapper.appendChild(clone);

    // Footer + timestamp
    const footer = document.createElement("div");
    footer.style.marginTop = "20px";
    footer.style.fontSize = "11px";
    footer.style.color = "#9ca3af";
    footer.style.position = "relative";
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";

    const source = document.createElement("div");
    source.innerText = "Source: https://spmdsf.vercel.app/";

    const timestamp = document.createElement("div");
    timestamp.innerText = `Generated: ${new Date().toLocaleString()}`;
    timestamp.style.fontSize = "11px";
    timestamp.style.color = "#6b7280";

    footer.appendChild(source);
    footer.appendChild(timestamp);

    wrapper.appendChild(footer);

    document.body.appendChild(wrapper);

    await new Promise((r) => setTimeout(r, 200));

    try {
      const dataUrl = await htmlToImage.toPng(wrapper, {
        cacheBust: true,
        pixelRatio: Math.min(3, window.devicePixelRatio * 2),
        backgroundColor: "#ffffff",
      });

      const blob = await (await fetch(dataUrl)).blob();

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        toast.success("Report copied as image", { icon: "📋" });
      } catch {
        const link = document.createElement("a");
        link.download = `dsf-report-${getTimestamp()}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Image downloaded", { icon: "⬇️" });
      }

      document.body.removeChild(wrapper);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export image");
    }
  }

  return (
    <motion.button
      onClick={exportImage}
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
      Export Image
    </motion.button>
  );
}