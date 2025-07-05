import React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent } from "../ui/dialog"
import { ArrowLeft } from "lucide-react"
import TouchFriendlyButton from "./TouchFriendlyButton"

interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Render modal differently on mobile: full screen with a back button.
 */
const MobileModal: React.FC<MobileModalProps> = ({ isOpen, onClose, children }) => {
  const isMobile = useIsMobile()

  if (!isOpen) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <TouchFriendlyButton variant="ghost" onClick={onClose}>
              <ArrowLeft size={24} />
            </TouchFriendlyButton>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  )
}

export default MobileModal
