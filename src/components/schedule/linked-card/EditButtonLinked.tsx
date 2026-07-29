// import Tooltip from "@/components/common/Tooltip.tsx";
// import { useState } from "react";
// import { ImportModal } from "@/components/calendar/ImportModal.tsx";
//
// export default function EditButtonLinked({ alias, name }: {alias: string, name: React.ReactNode }) {
//   const [importModalOpen, setImportModalOpen] = useState(false);
//
//   return (
//     <>
//       <Tooltip content={"Edit this calendar"}>
//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             e.preventDefault();
//             setImportModalOpen(true);
//           }}
//           className="hover:bg-base-200 rounded-box flex h-10 w-10 items-center justify-center text-3xl"
//         >
//           <span className="icon-[mdi--pencil] text-green-500 mb-1 h-8 w-8" />
//         </button>
//       </Tooltip>
//       <ImportModal
//         open={importModalOpen}
//         onOpenChange={setImportModalOpen}
//         aboveModal
//       />
//     </>
//   );
// }
