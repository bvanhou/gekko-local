<template lang='jade'>
  div
    .hr.contain
    div.contain
      h3 Backtest result
    result-summary(:report='result.report')
    .hr.contain
    chart(:data='result', height='1200', :config='config')
    .hr.contain
    roundtripTable(:roundtrips='result.roundtrips')
</template>

<script>
import resultSummary from './summary.vue'
import chart from './chartWrapper.vue'
import roundtripTable from './roundtripTable.vue'

export default {
  props: ['result', 'config'],
  data: () => {
    return {}
  },
  methods: {},
  components: {
    roundtripTable,
    resultSummary,
    chart
  }
}
</script>

<style>
</style>
