import React from 'react';
import { useApi } from '../hooks/useApi';
import { Card, Badge, LoadingSpinner } from '../components/UI';

export const MarketAnalysisPage: React.FC = () => {
  const { data: analysisRaw, loading } = useApi('/market/analysis');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const analyses: any[] = Array.isArray(analysisRaw) ? analysisRaw : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Market Analysis</h1>
        <p className="text-trading-text-muted">{analyses.length} symbol(s) analyzed</p>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <p className="text-trading-text-muted text-center py-8">
            No market analysis available — waiting for MT5 EA to connect and send data.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((item: any, idx: number) => {
            const trend = item?.trend ?? 'neutral';
            const symbol = item?.symbol ?? 'UNKNOWN';
            const indicators = item?.indicators ?? {};
            const support: number[] = Array.isArray(item?.support) ? item.support : [];
            const resistance: number[] = Array.isArray(item?.resistance) ? item.resistance : [];
            const rsi = indicators?.rsi ?? 0;
            const macd = indicators?.macd ?? 0;
            const ma20 = indicators?.ma20 ?? 0;
            const bbands = indicators?.bbands ?? { upper: 0, middle: 0, lower: 0 };

            const trendVariant =
              trend === 'bullish' ? 'success' : trend === 'bearish' ? 'danger' : 'warning';

            return (
              <Card key={item?.symbol ?? idx}>
                <div className="mb-4">
                  <h3 className="text-lg font-bold font-mono mb-2">{symbol}</h3>
                  <Badge variant={trendVariant}>{trend.toUpperCase()}</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-trading-text-muted mb-1">Indicators</p>
                    <div className="space-y-1 text-xs font-mono">
                      <div>RSI: {Number(rsi).toFixed(2)}</div>
                      <div>MACD: {Number(macd).toFixed(4)}</div>
                      <div>MA20: {Number(ma20).toFixed(5)}</div>
                      <div className="bg-slate-800/50 p-2 rounded">
                        <div>BBands Upper: {Number(bbands.upper).toFixed(5)}</div>
                        <div>BBands Middle: {Number(bbands.middle).toFixed(5)}</div>
                        <div>BBands Lower: {Number(bbands.lower).toFixed(5)}</div>
                      </div>
                    </div>
                  </div>

                  {support.length > 0 && (
                    <div>
                      <p className="text-trading-text-muted mb-1">Support Levels</p>
                      <div className="space-y-1">
                        {support.map((s, i) => (
                          <div key={i} className="text-xs font-mono text-amber-400">
                            S{i + 1}: {Number(s).toFixed(5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resistance.length > 0 && (
                    <div>
                      <p className="text-trading-text-muted mb-1">Resistance Levels</p>
                      <div className="space-y-1">
                        {resistance.map((r, i) => (
                          <div key={i} className="text-xs font-mono text-green-400">
                            R{i + 1}: {Number(r).toFixed(5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-trading-border">
                    <div className="flex items-center justify-between">
                      <span className="text-trading-text-muted">Trade Eligible:</span>
                      <Badge variant={item?.tradeEligible ? 'success' : 'danger'}>
                        {item?.tradeEligible ? 'YES' : 'NO'}
                      </Badge>
                    </div>
                    {item?.reason && (
                      <p className="text-xs text-trading-text-muted mt-2">{item.reason}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
