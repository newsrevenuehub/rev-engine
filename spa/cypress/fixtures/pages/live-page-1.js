const page = {
  id: 99,
  name: 'Test Page 1',
  heading: 'Test Heading 1',
  published_date: '2020-09-17T00:00:00',
  organization_is_nonprofit: true,
  elements: [
    {
      type: 'DRichText',
      uuid: 'testRichText1',
      requiredFields: [],
      content:
        '<p><strong>Your support keeps us going! Become a member today.</strong></p> <p>Because of your generosity, we have the courage, freedom, and independence to dedicate our entire newsroom to telling stories that spark action, improve lives and protect our democracy. Thank you for your support that keeps us going.</p>'
    },
    {
      type: 'DFrequency',
      uuid: 'testFreq1',
      requiredFields: [],
      content: [
        { value: 'one_time', displayName: 'One time' },
        { value: 'month', displayName: 'Monthly' },
        { value: 'year', displayName: 'Yearly' }
      ]
    },
    {
      type: 'DAmount',
      uuid: 'testAmount1',
      requiredFields: [],
      content: {
        allowOther: true,
        options: {
          one_time: [120, 180, 365],
          month: [10, 15, 25],
          year: [120, 180, 365],
          other: [22.45, 33]
        }
      }
    },
    { type: 'DDonorInfo', uuid: 'testDonorInfo1', requiredFields: [], content: { askPhone: true } },
    { type: 'DDonorAddress', uuid: 'testDonorAddress1' },
    { type: 'DAdditionalInfo', uuid: 'testAdditionalInfo', requiredFields: [], content: [] },
    {
      type: 'DReason',
      uuid: 'testReason',
      requiredFields: [],
      content: {
        askReason: true,
        reasons: ['test1', 'test2', 'test3'],
        askHonoree: true,
        askInMemoryOf: true
      }
    },
    {
      type: 'DSwag',
      uuid: 'testMemberBenefits',
      requiredFields: [],
      content: {
        optOutDefault: false,
        swagThreshold: 240,
        swags: [
          {
            swagName: 'Totes Dope Tote',
            swagOptions: [
              'Canvas -- blue',
              'Canvas -- red',
              'Recycled plastic -- multi-color',
              'Recycled plastic -- red'
            ]
          }
        ]
      }
    },
    {
      type: 'DPayment',
      uuid: 'testPayment1',
      requiredFields: [],
      content: { offerPayFees: true, stripe: ['card', 'apple', 'google', 'browser'] }
    }
  ],
  sidebar_elements: [
    { type: 'DRichText', uuid: 'testRichTextSE1', requiredFields: [], content: '<p><strong>Sidebar Blurb</strong>' },
    {
      type: 'DImage',
      uuid: 'testImageFile',
      requiredFields: [],
      content: { url: '/media/test.png', thumbnail: '/media/cache/thumbnail.png' }
    }
  ],
  styles: {
    colors: {
      primary: '#f0be18',
      secondary: '#f6471e',
      fieldBackground: '#f7f7f7',
      paneBackground: '#fff',
      inputBackground: '#fff',
      inputBorder: '#c3c3c3'
    },
    ruleStyle: 'dotted'
  },
  revenue_program: {
    id: 1,
    slug: 'myprogram',
    created: '2021-07-20T16:39:40.559524Z',
    modified: '2021-07-20T16:39:40.559524Z',
    name: 'MyRevProgram',
    contact_email: 'myrevprogram@mycompany.com',
    address: '123 Fake Street, Durham, NC 27701',
    organization: 14,
    default_donation_page: null,
    google_analytics_v3_id: 'UA-2222222',
    google_analytics_v3_domain: 'www.google.com',
    google_analytics_v4_id: 'G-2222222',
    facebook_pixel_id: '123456789'
  },
  currency: {
    code: 'CAD',
    symbol: '🍁'
  },
  stripe_account_id: 'testing_stripe_account_id',
  organization_country: 'US',
  revenue_program_pk: 1,
  allow_offer_nyt_comp: false
};

export default page;
