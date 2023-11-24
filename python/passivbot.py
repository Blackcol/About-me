# samples of private upgrades to public repo
# https://github.com/enarjord/passivbot

# asyncio.create_task(bot.ag_start_timer())  # AG_MOD
async def ag_start_timer(self):  # AG_MOD ag_timer
  while True:
      try:
          # logging.info("start_ag_timer init")
          need_adjust= False
          pprice_long = self.position["long"]["price"] or self.price
          pprice_short = self.position["short"]["price"] or self.price

          # check long
          if self.config['long']['ag_usd_sl'] > 0 and self.config['long']['ag_sl'] > 0 and pprice_long > 0:
              dist_to_sl = abs(
                  (pprice_long - self.config['long']['ag_sl']) / pprice_long)
              long_we_weighting = round(
                  dist_to_sl / self.xk["rentry_pprice_dist"][0], 4)
              if long_we_weighting != self.xk['rentry_pprice_dist_wallet_exposure_weighting'][0]:
                  self.xk['rentry_pprice_dist_wallet_exposure_weighting'] = (
                      long_we_weighting, self.xk["rentry_pprice_dist_wallet_exposure_weighting"][1])
                  logging.info(
                      f'[AG] long range adjusted: {round(self.xk["rentry_pprice_dist_wallet_exposure_weighting"][0] * self.xk["rentry_pprice_dist"][0], 4)}%'
                  )
                  self.dump_log({"msg": "long range adjusted", "data": f"{round((self.xk['rentry_pprice_dist_wallet_exposure_weighting'][0] * self.xk['rentry_pprice_dist'][0] * 100), 4)}%" })
                  
                  need_adjust = True

          # check short
          if self.config['short']['ag_usd_sl'] > 0 and self.config['short']['ag_sl'] > 0 and pprice_short > 0:
              dist_to_sl = abs(
                  (pprice_short - self.config['short']['ag_sl']) / pprice_short)
              short_we_weighting = round(
                  dist_to_sl / self.xk["rentry_pprice_dist"][1], 4)
              if short_we_weighting != self.xk['rentry_pprice_dist_wallet_exposure_weighting'][1]:
                  self.xk['rentry_pprice_dist_wallet_exposure_weighting'] = (
                      self.xk["rentry_pprice_dist_wallet_exposure_weighting"][0], short_we_weighting)
                  logging.info(
                      f'[AG] short range adjusted: {round((self.xk["rentry_pprice_dist_wallet_exposure_weighting"][1] * self.xk["rentry_pprice_dist"][1] * 100), 4)}%'
                  )
                  self.dump_log({"msg": "short range adjusted", "data": f"{round((self.xk['rentry_pprice_dist_wallet_exposure_weighting'][1] * self.xk['rentry_pprice_dist'][1] * 100), 4)}%" })
                  need_adjust = True

          self.ag_check_we()
          self.ag_check_position()
          await self.ag_check_tp_sl()

          # check balance diff
          if self.last_ag_balance != self.assigned_balance or need_adjust:
              self.update_ag_adjust()
      except Exception as e:
          logging.error(f"start_ag_timer error, attempting to restart... {e}")
          self.dump_log({"msg": f"start_ag_timer error, attempting to restart... {e}"})
          traceback.print_exc()
          self.last_ag_fetch_ts = 0
          self.last_ag_update_ts = 0
          # self.last_ag_we = (0, 0)
          self.last_ag_position = {"long": 0, "short": 0}
          self.ag_sl_ohlc_15_data = []
          self.ag_sl_ohlc_1_data = []
          self.ag_ohlc_5_data = []
          self.last_ag_fetch_m1 = 0
          await asyncio.sleep(6)
          await self.update_position()
      finally:
          # if self.stop_websocket:
          #     break
          await asyncio.sleep(4)

def ag_check_position(self):
  if self.last_ag_position['long'] == 0 and self.last_ag_position['short']== 0:
      self.last_ag_position['long'] = abs(self.position["long"]["size"])
      self.last_ag_position['short'] = abs(self.position["short"]["size"])
      return

  # check if is a possible pivot and update sl
  long_position = abs(self.position["long"]["size"])
  short_position = abs(self.position["short"]["size"])
  if long_position != self.last_ag_position["long"] and self.config["long"]["wallet_exposure_limit"] > 0 and self.config["long"]["ag_trailing_stop"] > 0:
      if long_position > 0 and long_position < self.last_ag_position["long"]:
          min_change = round(self.config["long"]["initial_qty_pct"] / (self.config["long"]["n_close_orders"] - 1), 4) * -1
          ct_diff = raw_diff(self.last_ag_position["long"], long_position)
          sl_reset = False
          if ct_diff <= min_change: 
              self.ag_ts_cache['long'] = self.price / 2
              sl_reset = True
          self.dump_log({"msg": "long sl is at possible pivot", "data": {"ct_pos": long_position, "prev_pos": self.last_ag_position["long"], "min_change": min_change, "ct_diff": ct_diff, "sl_reset": sl_reset}})

      self.last_ag_position['long'] = abs(self.position["long"]["size"])

  if short_position != self.last_ag_position["short"] and self.config["short"]["wallet_exposure_limit"] > 0 and self.config["short"]["ag_trailing_stop"] > 0:
      if short_position > 0 and short_position < self.last_ag_position["short"]:
          min_change = round(self.config["short"]["initial_qty_pct"] / (self.config["short"]["n_close_orders"] - 1), 4) * -1
          ct_diff = raw_diff(self.last_ag_position["short"], short_position)
          sl_reset = False
          if ct_diff <= min_change: 
              self.ag_ts_cache['short'] = self.price * 2
              sl_reset = True
              need_sl_update = True
          self.dump_log({"msg": "short sl is at possible pivot", "data": {"ct_pos": short_position, "prev_pos": self.last_ag_position["short"], "min_change": min_change, "ct_diff": ct_diff, "sl_reset": sl_reset}})
          
      self.last_ag_position['short'] = abs(self.position["short"]["size"])
    
async def ag_reduce_market(self, position_side, op_type, sell_per):  # AG_MOD exit ASAP
  orders_to_create = []
  sell_per = min(sell_per, 0.30) if "risk" in op_type else 1 # max sell 30% the pos to allow recalc
  ct_pos_size = abs(self.position[position_side]["size"])
  if ct_pos_size == self.xk["min_qty"] or ct_pos_size == 0 or ct_pos_size < (self.xk["min_qty"] * 6):
      ignore_msg = f"ag_reduce_market: ignored {sell_per}, current pos {self.position[position_side]['size']}"
      logging.info(ignore_msg)
      self.dump_log(
          {'smart_' + op_type: position_side, "info": ignore_msg})
      return
  params = {
      'side': 'buy' if position_side == 'short' else 'sell',
      'position_side': position_side,
      "qty": max(round_(abs(ct_pos_size * sell_per), self.xk["qty_step"]), self.xk["min_qty"]),
      "type": "market",
      "reduce_only": True,
      "custom_id": position_side + "_ag_close",
  }
  orders_to_create.append(params)
  result = await self.execute_market_order(orders_to_create[0])
  if result:
      order = result
      logging.info(
          f'ag_reduce_market {order["symbol"]} {order["side"]: <4} '
          + f'{order["position_side"]: <5} {float(order["qty"])}'
      )
      self.dump_log({'smart_' + op_type: position_side, 'params': params,
                    'price': self.price})
      
      await asyncio.sleep(3) # to avoid calling it too quickly, let that bot detects new position, etc..
