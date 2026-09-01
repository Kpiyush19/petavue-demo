import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeSlash, Info } from "@phosphor-icons/react";
import { ResetPasswordModal } from "./ResetPasswordModal";
import Button from "./Button";
import InputField from "./InputField";
import ToolTip from "./ToolTip";
import { useChangeUserName } from "../api/changeUserName";
import { useGetUserAPIKey } from "../api/getUserAPIKey";
import { useUserDetailStore } from "../stores/userDetailStore";
import { useShallow } from "zustand/react/shallow";

export default function UserDetails({ userDetail }) {
  const [fullName, setFullName] = useState(userDetail.name);
  const [resetModalState, setResetModalState] = useState(false);
  const [tooltipShow, setTooltipShow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copyText, setCopyText] = useState("Copy");
  const [keyHidden, setKeyHidden] = useState(true);

  const updateUserName = useChangeUserName();
  const getUserAPIKey = useGetUserAPIKey({ from: "profile" });

  const { user, setUserDetail } = useUserDetailStore(
    useShallow((state) => ({
      user: state.user,
      setUserDetail: state.setUser
    }))
  );

  const generateAPIKey = async () => {
    try {
      setGenerating(true);
      const data = await getUserAPIKey.mutateAsync();
      if (Boolean(data?.apiKey)) {
        let temp = { ...user };
        temp.apiKey = data?.apiKey;
        setUserDetail(temp);
      }
      setGenerating(false);
    } catch {
      toast.error('Failed to generate API key');
      setGenerating(false);
    }
  };

  const userDetails = [
    {
      title: "Full Name",
      placeholder: "Full Name",
      value: fullName
    },
    {
      title: "Role",
      placeholder: "Role",
      value: userDetail.role,
      disabled: true
    },
    {
      title: "Email",
      placeholder: "Email",
      value: userDetail.email,
      disabled: true
    }
  ];

  if (userDetail.loginType !== "google-signin") {
    userDetails.push({
      title: "Password",
      placeholder: "●●●●●●●●●●●●●●",
      value: "●●●●●●●●●●●●●●",
      disabled: true,
      button: true
    });
  }

  function getInitials(fullName) {
    const extractInitials = (str) =>
      str
        .split(/[_.]/)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    if (fullName) {
      const names = fullName?.split(" ");
      const initials = names
        .map((name, index) => (index === 0 || index === names?.length - 1 ? name[0] : ""))
        .filter(Boolean);

      if (initials.length === 0 && userDetail.email) {
        const emailInitials = extractInitials(userDetail.email?.split("@")[0]);
        return emailInitials;
      }

      return initials.join("").toUpperCase();
    } else if (userDetail.email) {
      const emailInitials = extractInitials(userDetail.email?.split("@")[0]);
      return emailInitials;
    }
    return "";
  }

  const elemChanger = (elem) => {
    if (elem.target.placeholder === "Full Name") setFullName(elem.target.value);
  };

  const handleKeyDown = (key) => {
    if (key.key === "Enter" && key.target.value !== userDetail.name) {
      if (key.target.value.trim() === userDetail.name) setFullName(userDetail.name);
      else handleUserNameChange();
    }
  };

  const handleBlur = (event) => {
    if (event.target.value !== userDetail.name) {
      if (event.target.value.trim() === userDetail.name) setFullName(userDetail.name);
      else handleUserNameChange();
    }
  };

  const handleUserNameChange = async () => {
    const data = {
      name: fullName.trim()
    };
    await updateUserName.mutateAsync(data);
  };

  const resetPassHandler = () => {
    setResetModalState((val) => !val);
  };

  useEffect(() => {
    if (copyText === "Copied") {
      setTimeout(() => {
        setCopyText("Copy");
      }, 3000);
    }
  }, [copyText]);

  return (
    <>
      <div className="rounded-lg overflow-auto w-full p-4 h-full overflow-hidden">
        <div className="min-w-[900px] h-full">
          <div className="flex bg-white rounded-lg p-[30px] items-center justify-between h-full w-full">
            <div className="h-full flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-5 w-full h-full overflow-y-auto">
                <div className="flex flex-col gap-6 w-full">
                  <div className="grid grid-cols-1 gap-6 w-full">
                    <div className="space-y-0.5 w-full">
                      <p className="text-black font-medium text-sm leading-5 mb-4">Profile Image</p>
                      <div
                        className={`h-16 w-16 flex justify-center items-center text-xl rounded-full ${
                          userDetail.role === "admin" ? "bg-[var(--color-primary-100)]" : "bg-[var(--color-grey-100)]"
                        }`}
                        style={{ userSelect: "none" }}
                      >
                        {getInitials(userDetail.name)}
                      </div>
                    </div>

                    {userDetails.map((elem, ind) => (
                      <div className="space-y-0.5 w-full" key={ind}>
                        <p className="text-black font-semibold text-sm leading-5 mb-4">{elem.title}</p>
                        <div className="flex gap-6 w-full">
                          <div className="w-2/5 max-w-lg min-w-64">
                            <InputField
                              type={elem.type ? elem.type : "text"}
                              placeholder={elem.placeholder}
                              disabled={elem.disabled}
                              value={elem.value}
                              onChange={(e) => elemChanger(e)}
                              onKeyDown={handleKeyDown}
                              onBlur={handleBlur}
                            />
                          </div>
                          {elem.button && (
                            <Button variant="secondary" onClick={resetPassHandler}>
                              Reset password
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="space-y-0.5 w-full">
                      <ToolTip
                        show={tooltipShow}
                        content="Your unique API key is required to authenticate access to all widget links generated for use outside the application."
                      >
                        <div className="flex gap-1.5 items-center mb-4">
                          <p className="text-black font-semibold text-sm leading-5">API Key</p>
                          <Info
                            size={16}
                            className="shrink-0 cursor-default"
                            onMouseEnter={() => setTooltipShow(true)}
                            onMouseLeave={() => setTooltipShow(false)}
                          />
                        </div>
                      </ToolTip>
                      <div className="flex gap-6 w-full">
                        <div className="flex items-center gap-3 w-2/5 max-w-lg h-9 min-w-64 rounded-lg bg-[var(--color-grey-50)] px-4 border border-[var(--color-grey-200)]">
                          {Boolean(userDetail?.apiKey) ? (
                            <>
                              <input
                                type="text"
                                className="h-full w-full bg-transparent border-0 text-sm text-[var(--color-grey-500)]"
                                placeholder="●●●●●●●●●●●●●●"
                                disabled={true}
                                value={keyHidden ? "●●●●●●●●●●●●●●" : `ApiKey ${userDetail.apiKey}`}
                              />
                              <button
                                className="p-[2px] rounded text-[var(--color-grey-400)] hover:bg-[var(--color-grey-100)]"
                                onClick={() => setKeyHidden((prev) => !prev)}
                              >
                                {keyHidden ? (
                                  <EyeSlash size={16} className="shrink-0" />
                                ) : (
                                  <Eye size={16} className="shrink-0" />
                                )}
                              </button>
                              <button
                                className="p-[2px] rounded text-[var(--color-grey-400)] hover:bg-[var(--color-grey-100)] disabled:opacity-50"
                                disabled={copyText === "Copied"}
                                onClick={() => {
                                  navigator.clipboard.writeText(`ApiKey ${userDetail.apiKey}`);
                                  setCopyText("Copied");
                                }}
                              >
                                {copyText === "Copied" ? (
                                  <Check size={16} className="shrink-0" />
                                ) : (
                                  <Copy size={16} className="shrink-0" />
                                )}
                              </button>
                            </>
                          ) : (
                            <input
                              type="text"
                              className="h-full w-full bg-transparent border-0 text-sm text-[var(--color-grey-400)]"
                              placeholder="Generate an API Key"
                              disabled={true}
                              value=""
                            />
                          )}
                        </div>
                        {!Boolean(userDetail?.apiKey) && (
                          <Button variant="secondary" onClick={generateAPIKey} disabled={generating}>
                            {generating ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                                Generating
                              </span>
                            ) : (
                              "Generate"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResetPasswordModal isOpen={resetModalState} onClose={resetPassHandler} />
    </>
  );
}
