import { useNavigate } from "react-router-dom";
import { WorkbookHome } from "./home/WorkbookHome";
import { WorkbookList } from "./list/WorkbookList";
import { WorkbookChat } from "./chat/WorkbookChat";

// Standalone workbook flow (URL-only reference screens). The pages already emit
// navigation intents via callbacks; here we map those to the /workbook routes.
// MenuBar ids outside this flow (reports, dashboard, settings, …) are no-ops.
function useWorkbookNav() {
  const navigate = useNavigate();
  return (id) => {
    if (id === "chats") navigate("/workbook/list");
    else if (id === "new-chat") navigate("/workbook");
  };
}

export function WorkbookHomeRoute() {
  const navigate = useNavigate();
  const onNavigate = useWorkbookNav();
  return <WorkbookHome onNavigate={onNavigate} onSubmit={() => navigate("/workbook/chat")} />;
}

export function WorkbookListRoute() {
  const navigate = useNavigate();
  const onNavigate = useWorkbookNav();
  return (
    <WorkbookList
      onNavigate={onNavigate}
      onSelectWorkbook={() => navigate("/workbook/chat")}
      onNewWorkbook={() => navigate("/workbook")}
    />
  );
}

export function WorkbookChatRoute() {
  const navigate = useNavigate();
  const onNavigate = useWorkbookNav();
  return <WorkbookChat onNavigate={onNavigate} onStop={() => navigate("/workbook")} />;
}
