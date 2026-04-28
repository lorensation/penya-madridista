import { loadEnvConfig } from "@next/env"

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback
  }

  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase())
}

async function main() {
  loadEnvConfig(process.cwd())

  const {
    REDSYS_PROFILE_REMINDER_CONFIRMATION_TOKEN,
    sendRedsysProfileCompletionReminders,
  } = await import("../src/lib/email/redsys-profile-completion-reminders")

  const dryRun = parseBoolean(process.env.DRY_RUN, true)
  const sendCopy = parseBoolean(process.env.SEND_COPY, true)
  const copyRecipient = process.env.COPY_RECIPIENT
  const confirmSend = process.env.CONFIRM_SEND

  if (dryRun) {
    console.info("[redsys.profile_completion_reminder] DRY_RUN=true; no emails will be sent.")
  } else {
    console.info(
      `[redsys.profile_completion_reminder] Real send requested. Required confirmation token: ${REDSYS_PROFILE_REMINDER_CONFIRMATION_TOKEN}`,
    )
  }

  const result = await sendRedsysProfileCompletionReminders({
    dryRun,
    sendCopy,
    copyRecipient,
    confirmSend,
  })

  console.info("[redsys.profile_completion_reminder] Summary")
  console.info(JSON.stringify(result, null, 2))

  if (result.failed > 0 || result.skipped > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error("[redsys.profile_completion_reminder] Fatal error", error)
  process.exitCode = 1
})
