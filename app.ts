import dayjs from "dayjs";
import puppeteer from "puppeteer";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  readStorageFile,
  writeStorageFile,
  type StatusResponse,
} from "./storage";

dayjs.extend(relativeTime);

async function main() {
  const prevResponses = await readStorageFile(
    process.env["STORAGE_PATH"] ?? "statuses.db"
  );

  console.log(new Date().toISOString(), "Authenticating...");

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(
      "https://sso.anef.dgef.interieur.gouv.fr/auth/realms/anef-usagers/protocol/openid-connect/auth?client_id=anef-usagers&redirect_uri=https%3A%2F%2Fadministration-etrangers-en-france.interieur.gouv.fr%2Fparticuliers%2F%23&response_mode=fragment&response_type=code&scope=openid&acr_values=eidas1"
    );
    await page.waitForSelector("#login");
    await page.type("#login", process.env["USERNAME"] ?? "");
    await page.type("#password", process.env["PASSWORD"] ?? "");
    await page.click("button[type=submit]");

    console.log(new Date().toISOString(), "Authenticated!");

    await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
    const resp = await page.goto(
      "https://administration-etrangers-en-france.interieur.gouv.fr/api/anf/dossier-stepper"
    );
    if (!resp) {
      await browser.close();
      throw new Error("No response");
    }

    const parsedResp = (await resp.json()) as StatusResponse;
    if (!parsedResp.dossier) {
      await browser.close();
      throw new Error(
        "There was an error fetching the status. Please check your credentials and try again."
      );
    }

    console.log(
      new Date().toISOString(),
      "status:",
      parsedResp.dossier?.statut,
      "last_update:",
      dayjs(parsedResp.dossier.date_statut).fromNow(),
      "(" + dayjs(parsedResp.dossier.date_statut).toISOString() + ")"
    );

    const prevStatusTime =
      prevResponses[prevResponses.length - 1]?.dossier?.date_statut;
    if (prevStatusTime !== parsedResp.dossier.date_statut) {
      console.log(new Date().toISOString(), "Status changed!");
      prevResponses.push(parsedResp);
      await writeStorageFile(process.env["STORAGE_PATH"] ?? "", prevResponses);
    }
  } catch (e) {
    throw e;
  } finally {
    await browser.close();
  }
}

await main();
