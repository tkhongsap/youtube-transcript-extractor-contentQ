interface MobileNavProps {
  onOpenMenu: () => void;
}

const MobileNav = ({ onOpenMenu }: MobileNavProps) => {
  return (
    <header className="md:hidden bg-white border-b border-gray-200 py-4 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-white mr-2">
          <span className="material-icons text-lg">auto_awesome</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Content Spark AI</h1>
      </div>
      <button 
        onClick={onOpenMenu}
        className="text-gray-500 focus:outline-none"
        aria-label="Open menu"
      >
        <span className="material-icons">menu</span>
      </button>
    </header>
  );
};

export default MobileNav;
