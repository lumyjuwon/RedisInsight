import { t } from 'testcafe';

import { RdiInstancesListPage } from '../../../../pageObjects/rdi-instances-list-page';
import { RdiInstance } from '../../../../pageObjects/components/myRedisDatabase/add-rdi-instance';
import { BrowserActions } from '../../../../common-actions/browser-actions';
import { RdiInstancePage } from '../../../../pageObjects/rdi-instance-page';
import { commonUrl } from '../../../../helpers/conf';
import { RdiPopoverOptions, RedisOverviewPage } from '../../../../helpers/constants';
import { MyRedisDatabasePage } from '../../../../pageObjects';
import { Common, DatabaseHelper } from '../../../../helpers';
import { RdiApiRequests } from '../../../../helpers/api/api-rdi';
import { goBackHistory } from '../../../../helpers/utils';

const rdiInstancesListPage = new RdiInstancesListPage();
const browserActions = new BrowserActions();
const rdiInstancePage = new RdiInstancePage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const databaseHelper = new DatabaseHelper();
const rdiApiRequests = new RdiApiRequests();

const rdiInstance: RdiInstance = {
    alias: 'Alias',
    url: 'https://54.175.165.214',
    username: 'username',
    password: 'v3rY$tronGPa33w0Rd3ECDb',
    version: '1.2'
};
const rdiInstance2: RdiInstance = {
    alias: 'test',
    url: 'https://54.175.165.214',
    username: 'name',
    password: 'v3rY$tronGPa33w0Rd3ECDb',
    version: '1.2'
};

const rdiInstance3: RdiInstance = {
    alias: 'first',
    url: 'https://54.175.165.214',
    username: 'name',
    password: 'v3rY$tronGPa33w0Rd3ECDb',
    version: '1.2'
};
//skip the tests until rdi integration is added

fixture `Rdi instance`
    .meta({ type: 'critical_path', feature: 'rdi' })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTerms();
        await rdiApiRequests.deleteAllRdiApi();
        await myRedisDatabasePage.setActivePage(RedisOverviewPage.Rdi);

    })
    .afterEach(async() => {
        // delete instances via UI
        await rdiInstancesListPage.deleteAllInstance();

    });
test('Verify that user can add and remove RDI', async() => {

    await rdiInstancesListPage.addRdi(rdiInstance);
    const addRdiInstance = await rdiInstancesListPage.getRdiInstanceValuesByIndex(0);

    await t.expect(addRdiInstance.alias).eql(rdiInstance.alias, 'added alias is not corrected');
    await t.expect(addRdiInstance.lastConnection?.length).gt(1, 'last connection is not displayed');
    await t.expect(addRdiInstance.url).eql(rdiInstance.url, 'added alias is not corrected');
    await t.expect(addRdiInstance.version).eql(rdiInstance.version, 'added alias is not corrected');

    let notification = rdiInstancesListPage.Toast.toastHeader.textContent;
    await t.expect(notification).contains('Instance has been added', 'The notification not displayed');
    await t.click(rdiInstancesListPage.Toast.toastCloseButton);
    await rdiInstancesListPage.deleteRdiByName(rdiInstance.alias);

    notification = rdiInstancesListPage.Toast.toastHeader.textContent;
    await t.expect(notification).contains('Instance has been deleted', 'The notification not displayed');

    await t.expect(rdiInstancesListPage.emptyRdiList.textContent).contains('Redis Data Integration', 'The instance is not removed');
});
test
    .after(async() => {
        await rdiInstancesListPage.deleteAllInstance();
    })('Verify that user can search by RDI', async() => {
        await rdiInstancesListPage.addRdi(rdiInstance);
        await rdiInstancesListPage.addRdi(rdiInstance2);
        await t.typeText(rdiInstancesListPage.searchInput, rdiInstance2.alias);
        const addedRdiInstance = await rdiInstancesListPage.getRdiInstanceValuesByIndex(0);
        await t.expect(addedRdiInstance.alias).eql(rdiInstance2.alias, 'correct item is displayed');

        await t.expect(await rdiInstancesListPage.rdiInstanceRow.count).eql(1, 'search works incorrectly');
    });
test('Verify that sorting on the list of rdi saved when rdi opened', async t => {
    // Sort by Connection Type
    await rdiInstancesListPage.addRdi(rdiInstance);
    await rdiInstancesListPage.addRdi(rdiInstance3);
    await rdiInstancesListPage.addRdi(rdiInstance2);

    const sortedByAlias = [rdiInstance.alias, rdiInstance3.alias, rdiInstance2.alias];
    await rdiInstancesListPage.sortByColumn('RDI Alias');
    let actualDatabaseList = await rdiInstancesListPage.getAllRdiNames();
    await rdiInstancesListPage.compareInstances(actualDatabaseList, sortedByAlias);
    await rdiInstancesListPage.clickRdiByName(rdiInstance.alias);
    await rdiInstancePage.selectStartPipelineOption(RdiPopoverOptions.Pipeline);
    await t.click(rdiInstancePage.RdiHeader.breadcrumbsLink);
    actualDatabaseList = await rdiInstancesListPage.getAllRdiNames();
    await rdiInstancesListPage.compareInstances(actualDatabaseList, sortedByAlias);
});
test('Verify that user has the same sorting if db name is changed', async t => {
    const newAliasName  = 'New alias';

    await rdiInstancesListPage.addRdi(rdiInstance);
    await rdiInstancesListPage.addRdi(rdiInstance3);
    await rdiInstancesListPage.addRdi(rdiInstance2);

    // Sort by  name
    const sortedByAliasType = [rdiInstance.alias, rdiInstance3.alias, rdiInstance2.alias];
    await rdiInstancesListPage.sortByColumn('RDI Alias');
    let actualDatabaseList = await rdiInstancesListPage.getAllRdiNames();
    await rdiInstancesListPage.compareInstances(actualDatabaseList, sortedByAliasType);
    // Change DB name insides of sorted list
    await rdiInstancesListPage.editRdiByName(rdiInstance.alias);
    await t.typeText(rdiInstancesListPage.AddRdiInstance.rdiAliasInput, newAliasName, { replace: true });
    await t.click(rdiInstancesListPage.AddRdiInstance.addInstanceButton);

    rdiInstance.alias = newAliasName;
    const addRdiInstance = await rdiInstancesListPage.getRdiInstanceValuesByIndex(1);

    await t.expect(addRdiInstance.alias).eql(rdiInstance.alias, 'added alias is not corrected');
    await t.expect(addRdiInstance.lastConnection?.length).gt(1, 'last connection is not displayed');
    await t.expect(addRdiInstance.url).eql(rdiInstance.url, 'added alias is not corrected');
    await t.expect(addRdiInstance.version).eql(rdiInstance.version, 'added alias is not corrected');

    const sortedByAliasTypeUpdated = [rdiInstance3.alias, rdiInstance.alias, rdiInstance2.alias];
    actualDatabaseList = await rdiInstancesListPage.getAllRdiNames();
    await rdiInstancesListPage.compareInstances(actualDatabaseList, sortedByAliasTypeUpdated);
});
test('Verify that button is displayed if user does not enter all mandatory information', async t => {

    const tooltipText = [
        'URL'
    ];

    await t.click(rdiInstancesListPage.rdiInstanceButton);
    await t.typeText(rdiInstancesListPage.AddRdiInstance.rdiAliasInput, rdiInstance.alias);

    await t.click(rdiInstancesListPage.AddRdiInstance.addInstanceButton);

    for (const text of tooltipText) {
        await browserActions.verifyTooltipContainsText(text, true);
    }
});
test('Verify that user can see the Redis Data Integration message on the empty RDI list', async t => {
    const noInstancesMessage = 'Redis Data Integration (RDI) synchronizes data from your existing database into Redis in near-real-time. We\'ve done the heavy lifting so you can turn slow data into fast data without coding.';
    const externalPageLink = 'https://redis.io/docs/latest/integrate/redis-data-integration/ingest/quick-start-guide/?utm_source=redisinsight&utm_medium=rdi&utm_campaign=rdi_list'

    await t.expect(rdiInstancesListPage.emptyRdiList.withText(noInstancesMessage).exists).ok('Empty RDI page message not displayed');

    await t.click(rdiInstancesListPage.addRdiFromEmptyListBtn);
    await t.expect(rdiInstancesListPage.AddRdiInstance.connectToRdiForm.exists).ok('Add rdi form not opened');
    await t.click(rdiInstancesListPage.AddRdiInstance.cancelInstanceBtn);

    await t.click(rdiInstancesListPage.quickstartBtn);
    await Common.checkURL(externalPageLink);
    await goBackHistory();
});
