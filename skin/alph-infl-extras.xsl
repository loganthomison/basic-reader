<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:xlink="http://www.w3.org/1999/xlink"
    version="1.0">
    <xsl:template match="reflink">
        <a href="{@xlink:href}" class="alph-reflink"><xsl:value-of select="."/></a>
    </xsl:template>
    <xsl:template name="add-footnote">
        <xsl:param name="item"/>
        <xsl:if test="$item/@footnote">
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$item/@footnote"/>
                <xsl:with-param name="delimiter" select="' '"/>
            </xsl:call-template>   
        </xsl:if>
    </xsl:template>    
    
    <xsl:template name="add-dialect">
        <xsl:param name="item"/>
        <xsl:if test="$item/@dialects">
            <a href="#dialect" class="footnote">D</a>
            <span class="footnote-text"><xsl:value-of select="$item/@dialects"/></span>
            <xsl:if test="$item/@footnote">
                <span class="footnote-delimiter">,</span>
            </xsl:if>
        </xsl:if>
    </xsl:template>    
    
    <xsl:template name="footnote-tokens">
        <xsl:param name="list" />
        <xsl:param name="delimiter" />
        <xsl:variable name="newlist">
            <xsl:choose>
                <xsl:when test="contains($list, $delimiter)"><xsl:value-of select="normalize-space($list)" /></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(normalize-space($list), $delimiter)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
        <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
        <xsl:variable name="num" select="substring-after($first,'-')"/>
        <a href="#{$first}" class="footnote"><xsl:value-of select="$num"/></a>
        <span class="footnote-text"><xsl:apply-templates select="key('footnotes',$first)"/></span>
        <xsl:if test="$remaining">
            <span class="footnote-delimiter">,</span>
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$remaining" />
                <xsl:with-param name="delimiter"><xsl:value-of select="$delimiter"/></xsl:with-param>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="ul">
        <xsl:copy-of select="."/>
    </xsl:template>

    <!-- template to produce header for stem header row -->
    <xsl:template name="stem-header">
        <xsl:param name="header"/>
        <xsl:if test="$header='decl'">
            <br/><span class="header-text">stem</span>
        </xsl:if>
    </xsl:template>
    
    <!-- template to produce data for stem header row -->
    <xsl:template name="stem-data" match="order-item[@attname='decl']">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>                                
        <br/>
        <xsl:variable name="thisdecl" select="text()"/>
        <xsl:apply-templates select="/infl-data/stem-table/stem[@decl=$thisdecl]"/>
    </xsl:template>
    
    <xsl:template name="no-sub" match="order-item">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>        
    </xsl:template>
    
    <xsl:template match="stem">
        <span class="stem"><xsl:value-of select="text()"/></span>
        <xsl:if test="stem-class">
            <ul class="stem-class-block">
                <li class="stem-class-toggle header-text">stem-classes</li>
                <ul class="stem-classes">
                    <xsl:apply-templates select="stem-class"/>                
                </ul>
            </ul>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="stem-class">
        <li id="{@id}" class="{@type}"><span class="stem-class-desc"><xsl:apply-templates select="reflink"/></span></li>        
    </xsl:template>
    
    <xsl:template name="infl-set-context">
        <xsl:param name="infl_set"/>
        <!--
        <xsl:if test="$infl_set/@decl">
            <xsl:value-of select="concat('decl:',$infl_set/@decl)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@conj">
            <xsl:value-of select="concat('conj:',$infl_set/@conj)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        -->
        <xsl:if test="$infl_set/@pers">
            <xsl:value-of select="concat('pers:',$infl_set/@pers)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@gend">
            <xsl:value-of select="concat('gend:',$infl_set/@gend)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@num">
            <xsl:value-of select="concat('num:',$infl_set/@num)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@case">
            <xsl:value-of select="concat('case:',$infl_set/@case)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@voice">
            <xsl:value-of select="concat('voice:',$infl_set/@voice)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@tense">
            <xsl:value-of select="concat('tense:',$infl_set/@tense)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@mood">
            <xsl:value-of select="concat('mood:',$infl_set/@mood)"/>
            <xsl:text>-</xsl:text>
        </xsl:if>
        <xsl:if test="$infl_set/@hdwd">
            <xsl:value-of select="concat('hdwd:',$infl_set/@hdwd)"/>
        </xsl:if>
    </xsl:template>
</xsl:stylesheet>