import { Chance } from 'chance';
import { getRandomParagraph } from '../../../helpers/keys';
import { acceptLicenseTermsAndAddDatabaseApi } from '../../../helpers/database';
import { MyRedisDatabasePage, WorkbenchPage, CliPage } from '../../../pageObjects';
import { rte } from '../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../helpers/conf';
import { deleteStandaloneDatabaseApi } from '../../../helpers/api/api-database';
import { Common } from '../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const chance = new Chance();
const cliPage = new CliPage();
const common = new Common();

const oneMinuteTimeout = 60000;
let keyName = chance.word({ length: 10 });
const command = `set ${keyName} test`;

fixture `History of results at Workbench`
    .meta({type: 'regression'})
    .page(commonUrl)
    .beforeEach(async t => {
        await acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig, ossStandaloneConfig.databaseName);
        //Go to Workbench page
        await t.click(myRedisDatabasePage.workbenchButton);
    })
    .afterEach(async() => {
        //Clear and delete database
        await cliPage.sendCommandInCli(`DEL ${keyName}`);
        await deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .meta({ rte: rte.standalone })('Verify that user can see original date and time of command execution in Workbench history after the page update', async t => {
        keyName = chance.word({ length: 5 });
        //Send command and remember the time
        await workbenchPage.sendCommandInWorkbench(command);
        const dateTime = await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssCommandExecutionDateTime).textContent;
        //Wait fo 1 minute, refresh page and check results
        await t.wait(oneMinuteTimeout);
        await common.reloadPage();
        await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssCommandExecutionDateTime).textContent).eql(dateTime, 'The original date and time of command execution is saved after the page update');
    });
//skipped due the long time execution and hangs of test
test.skip
    .meta({ rte: rte.standalone })
    .after(async() => {
        //Delete database
        await deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that if command result is more than 1 MB and user refreshes the page, the message "Results have been deleted since they exceed 1 MB. Re-run the command to see new results." is displayed', async t => {
        const commandToSend = 'set key';
        const commandToGet = 'get key';
        //Send command with value that exceed 1MB
        const commandText = getRandomParagraph(10).repeat(100);
        await workbenchPage.sendCommandInWorkbench(`${commandToSend} "${commandText}"`);
        await workbenchPage.sendCommandInWorkbench(commandToGet);
        //Refresh the page and check result
        await common.reloadPage();
        await t.click(workbenchPage.queryCardContainer.withText(commandToGet));
        await t.expect(workbenchPage.queryTextResult.textContent).eql('"Results have been deleted since they exceed 1 MB. Re-run the command to see new results."', 'The messageis displayed');
    });
test
    .meta({ rte: rte.standalone })('Verify that the first command in workbench history is deleted when user executes 31 command (new the following result replaces the first result)', async t => {
        keyName = chance.word({ length: 10 });
        const numberOfCommands = 30;
        const firstCommand = 'FT._LIST';
        //Send command the first command
        await workbenchPage.sendCommandInWorkbench(firstCommand);
        await t.expect(workbenchPage.queryCardContainer.nth(0).textContent).contains(firstCommand, 'The first executed command is in the workbench history');
        //Send 30 commands and check the results
        await workbenchPage.sendCommandInWorkbench(`${numberOfCommands} ${command}`);
        await t.expect(workbenchPage.queryCardCommand.find('span').withExactText(`${firstCommand}`).exists).notOk('The first command is not in the history result');
        await t.expect(workbenchPage.queryCardCommand.count).eql(30, { timeout: 5000 });
    });
test
    .meta({ rte: rte.none })('Verify that user can see cursor is at the first character when Editor is empty', async t => {
        const commands = [
            'FT.INFO',
            'RANDOMKEY'
        ];
        const commandForCheck = 'SET';
        //Send commands
        for(const command of commands) {
            await workbenchPage.sendCommandInWorkbench(command);
        }
        //Verify the quick access to history works when cursor is at the first character
        await t.typeText(workbenchPage.queryInput, commandForCheck);
        await t.pressKey('enter');
        await t.pressKey('up');
        const script = await workbenchPage.scriptsLines.textContent;
        await t.expect(script.replace(/\s/g, ' ')).contains(commandForCheck, 'The command is not changed');
    });
